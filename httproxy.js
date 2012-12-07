var http = require('http'),
   https = require('https'),
     url = require('url'),
      fs = require('fs'),
  domino = require('./domino/lib');

// Configuration
var lib = 'lib';
var narcissus = 'narcissus/lib';

var hostname = process.argv[2] || 'jsflow.monitor';
http.port = process.argv[3] || 80;
https.port = process.argv[4] || 443;

https.options = {
  key: fs.readFileSync(hostname + '.key'),
  cert: fs.readFileSync(hostname + '.cert')
};

var host = new RegExp("\\." + hostname.replace(/\./, '\\.'));
var url = /^(?:https?:)?\/\/([.\-a-zA-Z0-9]+)/;
var events = [
  'onload',
  'onunload',
  'onblur',
  'onchange',
  'onfocus',
  'onreset',
  'onselect',
  'onsubmit',
  'onabort',
  'onerror',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmousemove',
  'onmouseout',
  'onmouseover',
  'onmouseup',
  'onresize',
  'onscroll',
  'onhelp' // XXX: Only seen it mentioned once, exists?
  ];

var proxyInline = function(nodes, attr) {
  for (var i = 0; i < nodes.length; i++) {
    if (url.test(nodes[i][attr]))
      nodes[i][attr] = nodes[i][attr].replace(url, 'http://$1.' + hostname);
  }
}

var eventInline = function(nodes, attr) {
  for (var i = 0; i < nodes.length; i++)
    nodes[i]._attrsByQName[attr].data = 'Monitor.handleEvent(\'' + nodes[i]._attrsByQName[attr].data.replace(/\\/g, '\\\\').replace(/'/g, '\\\'') + '\', event)'
}

// TODO: Add logging
var proxy = function(req, res) {
  try {
    console.log('Proxying: ' + req.headers['host'] + req.url);
    // DONE: Serve monitor files
    if (req.headers['host'] === hostname) {
      // DONE: Prevent directory traversal attacks
      req.url = req.url.replace(/\/(\.\.\/)+/g, '/');

      if (fs.existsSync(lib + req.url)) {
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.write(fs.readFileSync(lib + req.url).toString().replace(/%hostname%/g, hostname));
      } else if (fs.existsSync(narcissus + req.url)) {
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.write(fs.readFileSync(narcissus + req.url));
      } else {
        res.writeHead(404);
      }
      res.end();

    } else {
      // DONE: Strip headers (prevent encoding and disable caching)
      delete req.headers['accept-encoding'];
      delete req.headers['if-modified-since'];
      delete req.headers['if-none-match'];
      delete req.headers['cache-control'];

      // DONE: Strip monitor domain
      req.host = req.headers.host = req.headers.host.replace(host, '');
      if (req.headers.referer)
        req.headers.referer = req.headers.referer.replace(host, '');
      req.path = req.url;

      // DONE: Add HTTPS support
      var preq = (req.protocol == 'http:' ? http : https).request(req, function(pres) {

        // DONE: Rewrite redirects (status 302)
        if (pres.headers['location'])
          pres.headers['location'] = pres.headers['location'].replace(url, 'http://$1.' + hostname);

        // DONE: Disable caching (at least temporarily)
        delete pres.headers['last-modified'];
        delete pres.headers['expires'];
        delete pres.headers['etag'];
        delete pres.headers['age'];
        delete pres.headers['cache-control'];

        if (/html/.test(pres.headers['content-type'])) {

          var parser = new domino.Parser();
          parser.parse(pres);
          parser.on('end', function() {
            var document = parser.document();

            // TODO: Seems to be some kind of problem with the line below, not all tags are selected
            proxyInline(document.querySelectorAll('a'), 'href');
            proxyInline(document.querySelectorAll('script[src]'), 'src');
            proxyInline(document.querySelectorAll('form[action]'), 'action');
            proxyInline(document.querySelectorAll('iframe[src]'), 'src');
            proxyInline(document.querySelectorAll('frame[src]'), 'src');
            proxyInline(document.querySelectorAll('area[href]'), 'href');
            // TODO: Deal with OBJECT and EMBED tags

            var scripts = document.querySelectorAll('script');
            // DONE: Handle inline scripts
            for (var i = 0; i < scripts.length; i++) {
              if (scripts[i].src === '/')
                scripts[i].text = 'Monitor.evaluate("' + scripts[i].text.replace(/^<!--/, '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, "\\n\\\n") + '")';
            }

            // DONE: Handle all event handlers
            for (var key in events)
              eventInline(document.querySelectorAll('[' + events[key] + ']'), events[key]);

            // DONE: Add monitor
            var bootstrap = document.createElement('script');
            bootstrap.src = 'http://' + hostname + '/bootstrap.js';
            document.head.insertBefore(bootstrap, document.head.firstChild);
            var monitor = document.createElement('script');
            monitor.src = 'http://' + hostname + '/monitor.js';
            document.head.insertBefore(monitor, bootstrap);

            var html = document.innerHTML;
            pres.headers['content-length'] = html.length;
            res.writeHead(pres.statusCode, pres.headers);
            res.write(html);
            res.end();

          });

        } else if (/javascript/.test(pres.headers['content-type'])) {

          // TODO: Calculate the new length instead of deleting the content-length header
          delete pres.headers['content-length'];
          res.writeHead(pres.statusCode, pres.headers);
          res.write('Monitor.evaluate("');

          pres.on('data', function(chunk) {
            res.write(chunk.toString('utf8').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, "\\n\\\n"));
          });

          pres.on('end', function() {
            res.write('")');
            res.end();
          });

        } else {

          res.writeHead(pres.statusCode, pres.headers);

          pres.on('data', function(chunk) {
            res.write(chunk);
          });

          pres.on('end', function() {
            res.end();
          });

        }

      });

      req.on('data', function(chunk) {
        preq.write(chunk);
      });

      req.on('end', function() {
        preq.end();
      });

      preq.on('error', function(e) {
        res.end();
        console.log('Error proxying request: ' + e);
      });

    }

  } catch (e) {

    console.log(e);

  }
}

// DONE: Add HTTPS support
// TODO: Listen on all ports
http.createServer(function(req, res) { req.protocol = 'http:'; proxy(req, res) }).listen(http.port);
https.createServer(https.options, function(req, res) { req.protocol = 'https:'; proxy(req, res) }).listen(https.port);

console.log('HTTProxy (' + hostname + ') started!');
