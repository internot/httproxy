(function() {
  for (var i in Monitor.files.narcissus)
    document.write('<script src="http://%hostname%/' + Monitor.files.narcissus[i] + '.js"></script>');
  for (var i in Monitor.files.jsflow)
    document.write('<script src="http://%hostname%/' + Monitor.files.jsflow[i] + '.js"></script>');
  for (var i in Monitor.files.dom)
    document.write('<script src="http://%hostname%/dom/' + Monitor.files.dom[i] + '.js"></script>');
  document.write('<script src="http://%hostname%/snowfox.js"></script>');

  document.write('<script type="text/javascript">JSFlow.monitor.initialize(window);</script>');
  // document.write('<script src="http://jsflow.monitor/error.js"></script>');document.location.hasOwnProperty = {}.hasOwnProperty; document.location.attributes = document.location.parentNode = null; document.location.childNodes = { length: 0 }; JSFlow.monitor.evaluate("Image = function(){ return {} }, screen = {width: " + screen.width + "}");
})();