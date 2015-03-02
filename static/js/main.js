
$(document).ready( function () {

 var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

  function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  function SetTable(data) {
    data_ro = data[0]
    cols = []
    for(k in data_ro) {
      cols.push(k);
    }
    var header_row_html = '<tr>';
    for (var i = 0; i < cols.length; i++) {
      header_row_html += '<th>';
      header_row_html += escapeHtml(cols[i]);
      header_row_html += '</th>';
    }
    header_row_html += '</tr>';
    
    var table = $('#data_table');
    var table_html = header_row_html;

    for(var i=0; i < data.length; i++) {
      row = '<tr>';
      for (var j = 0; j < cols.length; j++) {
        row += '<td>';
        row += escapeHtml(data[i][cols[j]]);
        row += '</td>';
      }
      row += '</tr>';
      table_html += row;
    }
    table.html(table_html);
  }

  function outf(text)
  {
      stdout = $('#stdout');
      var base_text =  stdout.text();
      stdout.text(base_text + text);
  }

  function getPythonFunction() {
      var prog = document.getElementById("code").value;
      $('#stdout').text('');
      $('#stderr').text('');
      Sk.configure({output:outf});
      var output = null;
      try {
          var module = Sk.importMainWithBody("<stdin>", false, prog);
          var funct = module.tp$getattr('process');
          return funct
          var ret = Sk.misceval.callsim(funct,
                                        Sk.ffi.remapToPy(input))
          output = Sk.ffi.remapToJs(ret);
      } catch (e) {
          var error = e;
          console.dir(error);
          console.log(error);
          old_stderr = $('#stderr').text();
          $('#stderr').text(old_stderr + error);
      }
      return null;
  }

  function runPythonOn(funct, input) {
      if (funct == null)
        return null;
      var output = null;
      try {
          var ret = Sk.misceval.callsim(funct,
                                        Sk.ffi.remapToPy(input))
          output = Sk.ffi.remapToJs(ret);
      } catch (e) {
          var error = e + '\n With input: ' + JSON.stringify(input, null, 4)
          console.dir(error);
          console.log(error);
          old_stderr = $('#stderr').text();
          $('#stderr').text(old_stderr + error);
      }
      return output;
  }


  function runit()
  {
    var input = JSON.parse($('#input').text());
    output = runPythonOn(getPythonFunction(), input);
    $('#output').text(JSON.stringify(output, null, 4));
  }
  window.runit = runit;

  var mapOptions = {
    center: { lat: 0, lng: 0},
    zoom: 2
  };

  var mymap = $('#map-canvas').get(0);
  if(window.online) {
    var map = new google.maps.Map(mymap, mapOptions);
  }

  var markers = [];

  function clearMarkers() {
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(null);
    }
    markers = [];
  }

  function setMarker(latitude, longitude, name) {
    latlng = { lat: latitude, lng: longitude};
    var marker = new google.maps.Marker({
        position: latlng,
        map: map,
        title: name
    });
    markers.push(marker);
  }

  function setMarkers(data) {
    clearMarkers();
    for(var i = 0; i < data.length; i++) {
      var point = data[i];
      var longitude = Number(point['longitude']);
      var latitude = Number(point['latitude']);
      var name = point['language'];
      setMarker(latitude, longitude, name);
    }
  }

  function filtertable() {
    var filtered_data = []
    var f = getPythonFunction();
    for(var i = 0; i < window.data.length; i++) {
      var input = window.data[i]
      var output = runPythonOn(f, input);
      if (output) {
        filtered_data.push(output)
      }
    }
    SetTable(filtered_data);
    if(window.online) {
      setMarkers(filtered_data);
    }
  }
  window.filtertable = filtertable;

  window.data = [];


  $.get('/data.json').done(function(data) {
    window.data = data;
    $("#input").text(JSON.stringify(data[0], null, 4));
  });

  


});
