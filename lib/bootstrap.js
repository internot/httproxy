(function () {
  Monitor.hostname = '%hostname%';
  for (var i in Monitor.files.narcissus)
    document.write('<script src="http://' + Monitor.hostname + '/' + Monitor.files.narcissus[i] + '.js"></script>');
  for (var i in Monitor.files.jsflow)
    document.write('<script src="http://' + Monitor.hostname + '/' + Monitor.files.jsflow[i] + '.js"></script>');
  for (var i in Monitor.files.dom)
    document.write('<script src="http://' + Monitor.hostname + '/dom/' + Monitor.files.dom[i] + '.js"></script>');
  document.write('<script src="http://' + Monitor.hostname + '/snowfox.js"></script>');

  document.write('<script type="text/javascript">Monitor.initialize(window, Monitor.DOM.Ext.WindowObject);</script>');

  Monitor.log = function (m) { console.log(m) };
  Monitor.error = function (m) { console.log(m) };
  Monitor.warn = function (m) { console.log(m) };
  Monitor.print = function (m) { console.log(m) };
  Monitor.securityError = function (m) { alert('[Security violation] ' + m); Monitor.fatal('[Security violation] ' + m); };

  // Hide the WrappedNative from being wrapped by the monitor which would lead to an Exception
  //window.external = {};

  // TODO: Not sure if this is the right thing to do...
  // Copied in large parts from SnowFox/chrome/content/addon.js
  Monitor.toplvl = function (f) { f(); };

  // document.write('<script src="http://jsflow.monitor/error.js"></script>');document.location.hasOwnProperty = {}.hasOwnProperty; document.location.attributes = document.location.parentNode = null; document.location.childNodes = { length: 0 }; JSFlow.monitor.evaluate("Image = function(){ return {} }, screen = {width: " + screen.width + "}");
})();