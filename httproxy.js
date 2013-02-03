var http = require('http'),
   https = require('https'),
      fs = require('fs');

// Configuration
var hostname = process.argv[2] || 'jsflow.monitor';
http.port = process.argv[3] || 80;
https.port = process.argv[4] || 443;

https.options = {
  key: fs.readFileSync(hostname.match(/(.+\.)?(.+\..+)/)[1] + '.key'),
  cert: fs.readFileSync(hostname.match(/(.+\.)?(.+\..+)/)[1] + '.cert')
};

var host = new RegExp("\\." + hostname.replace(/\./, '\\.'));
var url = /^((?:https?:)?\/\/[.\-a-zA-Z0-9]+)/;

// TODO: Add logging
var proxy = function (req, res) {
  try {
    // DONE: Serve monitor files
    if (req.headers['host'] === hostname) {
      // DONE: Prevent directory traversal attacks
      req.url = req.url.replace(/\/(\.\.\/)+/g, '/');

      if (fs.existsSync(lib + req.url)) {
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.write(fs.readFileSync(lib + req.url).toString().replace(/%hostname%/g, hostname));
      } else {
        res.writeHead(404);
      }
      res.end();

    } else {

      console.log('Proxying: ' + req.headers['host'] + req.url);

      // DONE: Strip headers (prevent encoding and disable caching)
      // TODO?: Support encoding
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
      var preq = (req.protocol == 'http:' ? http : https).request(req, function (pres) {

        // DONE: Rewrite redirects (status 302)
        if (pres.headers['location'])
          pres.headers['location'] = pres.headers['location'].replace(url, '$1.' + hostname);

        // DONE: Disable caching (at least temporarily)
        delete pres.headers['last-modified'];
        delete pres.headers['expires'];
        delete pres.headers['etag'];
        delete pres.headers['age'];
        delete pres.headers['cache-control'];

        if (/javascript/.test(pres.headers['content-type'])) {

          // TODO: Calculate the new length instead of deleting the content-length header
          delete pres.headers['content-length'];
          res.writeHead(pres.statusCode, pres.headers);
          res.write('Monitor.evaluate("');

          pres.on('data', function (chunk) {
            res.write(chunk.toString('utf8').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, "\\n\\\n"));
          });

          pres.on('end', function () {
            res.write('")');
            res.end();
          });

        } else {

          res.writeHead(pres.statusCode, pres.headers);

          pres.on('data', function (chunk) {
            res.write(chunk);
          });

          pres.on('end', function () {
            res.end();
          });

        }

      });

      req.on('data', function (chunk) {
        preq.write(chunk);
      });

      req.on('end', function () {
        preq.end();
      });

      preq.on('error', function (e) {
        res.end();
        console.log('Error proxying request: ' + e);
      });

    }

  } catch (e) {

    res.end();
    console.log(e);

  }
}

// DONE: Add HTTPS support
// TODO?: Listen on all ports
http.createServer(function(req, res) { req.protocol = 'http:'; proxy(req, res) }).listen(http.port);
https.createServer(https.options, function(req, res) { req.protocol = 'https:'; proxy(req, res) }).listen(https.port);

console.log('HTTProxy (' + hostname + ') started!');
