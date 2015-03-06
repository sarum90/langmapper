
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
    if (string == null) {
      return "";
    }
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

  var editor = ace.edit("code");
  editor.setTheme("ace/theme/monokai");
  editor.getSession().setMode("ace/mode/python");

  function getPythonFunction() {
      var prog = editor.getValue();
      localStorage.setItem("python", prog);
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

  function isEmptyObj(obj) {
    if (typeof(obj) != "object") {
      return false;
    }
    for (var i in obj) {
      return false;
    }
    return true;
  }

  function convertEmptyObjsToNull(obj) {
    for (var key in obj) {
      var val = obj[key];
      if (isEmptyObj(val)) {
        obj[key] = null;
      }
    }
    return obj;
  }

  function runPythonOn(funct, input, glotto) {
      if (funct == null)
        return null;
      var output = null;
      try {
          var ret = Sk.misceval.callsim(funct,
                                        Sk.ffi.remapToPy(input),
                                        Sk.ffi.remapToPy(glotto))
          output = Sk.ffi.remapToJs(ret);
      } catch (e) {
          var error = e + '\n With input: ' + JSON.stringify(input, null, 4)
          console.dir(error);
          console.log(error);
          old_stderr = $('#stderr').text();
          $('#stderr').text(old_stderr + error);
      }
      return convertEmptyObjsToNull(output);
  }


  function runit()
  {
    var input = JSON.parse($('#input').text());
    output = runPythonOn(getPythonFunction(), input['record'], input['glotto']);
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

  function toTwoDigitHex(num) {
    var s = num.toString(16);
    while (s.length < 2) {
      s = "0" + s;
    }
    return s;
  }

  function safeget(list, index) {
    if(!list || !list.length) {
      return 0;
    }
    if (list.length <= index) {
      return 0;
    }
    return list[index];
  }

  function processColor(list) {
    var red = safeget(list, 0);
    var green = safeget(list, 1);
    var blue = safeget(list, 2);
    return '#' + toTwoDigitHex(red) + toTwoDigitHex(green) + toTwoDigitHex(blue);
  }

  function setMarker(latitude, longitude, name, c) {
    latlng = { lat: latitude, lng: longitude};
    //var marker = new google.maps.Marker({
    //    position: latlng,
    //    map: map,
    //    title: name
    //});
   var color = processColor(c);
    var marker = new google.maps.Marker({
      position: latlng,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5,
        fillColor: color,
        fillOpacity: 1,
        strokeOpacity: 0,
      },
      map: map,
      title: name
    });
   //var circleOptions = {
   //   strokeColor: color,
   //   strokeOpacity: 0.8,
   //   strokeWeight: 2,
   //   fillColor: color,
   //   fillOpacity: 0.35,
   //   map: map,
   //   center: latlng,
   //   radius: 100000
   // };
   // // Add the circle for this city to the map.
   // var marker = new google.maps.Circle(circleOptions);
    markers.push(marker);
  }

  function setMarkers(data) {
    clearMarkers();
    for(var i = 0; i < data.length; i++) {
      var point = data[i];
      var longitude = Number(point['longitude']);
      var latitude = Number(point['latitude']);
      var name = point['language'];
      if (!name || name == "") {
        name = point['name'];
      }
      var color = point['color'];
      setMarker(latitude, longitude, name, color);
    }
  }


  function filtertable() {
    var filtered_data = []
    var f = getPythonFunction();
    var sheetdata = window.data.sheet;
    var glottodata = window.data.glotto;
    for(var i = 0; i < sheetdata.length; i++) {
      var input = sheetdata[i];
      var glotto = glottodata[i];
      var output = runPythonOn(f, input, glotto);
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

  window.data = {
    sheet: []
  };

  var href = window.location.href;
  var parts = href.split('?');
  var query = parts[parts.length-1];
  var qparts = query.split('/');
  var sheet_id = qparts[0];
  var worksheet_id = qparts[1];

  window.ajax = $.ajax({type: 'GET',
                        url: sheet_id + '/' + worksheet_id +'/data.json',
                        dataType: "text"}).success(function(stringdat) {
    $('#loadingbar').hide();
    data = JSON.parse(stringdat)
    window.data = data;
    $("#input").text(JSON.stringify({record: data.sheet[0],
                                     glotto: data.glotto[0]}, null, 4));
  }).fail(function(e, f, g) {
    console.log("Failure to get data:");
    console.log(e);
    console.log(f);
    console.log(g);
  });

  
  var default_text = "" +
    "def process(record, glotto):\n" +
    "  return record\n";
  
  var text = localStorage.getItem("python");
  if(!text || text == "") {
    text = default_text;
  }
  editor.setValue(text);

  example_texts = {
    "langlength": {
      name: "Languages Colored by Language Length",
      code: "" +
          "def process(record, glotto):\n" +
          "  name = record['language']\n" +
          "  return {'name': name,\n" +
          "          'longitude': record['longitude'],\n" +
          "          'latitude': record['latitude'],\n" +
          "          'color': (min(255, len(name)*25), 0, 0)}\n"
    },
    "pt": {
      name: "Passthrough",
      code: "" +
          "def process(record, glotto):\n" +
          "  return record\n"
    },
    'chinaur': {
      name: "UR values of Chinease values",
      code: "" +
        "def makeColor(ur):\n" +
        '    """Make a color that is green for high values of ur, and red for low values\n' +
        '       of ur. Output is [red, green, blue]"""\n' +
        "    x = 15\n" +
        "    y = 200\n" +
        "    try:\n" +
        "        ur = max(0, min(y/x, float(ur or 0))) * x\n" +
        "        return [y - ur, ur, 0]\n" +
        "    except ValueError:\n" +
        "        return [0, 0, 0]\n" +
        "\n" +
        "def process(record, glotto):\n" +
        "    if 'China' in record['areal']:\n" +
        "        return {'name': record['language'],\n" +
        "                'longitude': record['longitude'],\n" +
        "                'latitude': record['latitude'],\n" +
        "                'color': makeColor(record['ur'])}\n"
    }
                
  }

  var select_options = '<option value=""></option>';
  for (key in example_texts) {
    select_options += '<option value="' + key + '">' +
        example_texts[key].name + '</option>';
  }
  $('#examples').html(select_options);


  $('#examples').on('change', function() {
    var key = $('#examples').val();
    if (key in example_texts) {
      code = example_texts[key].code;
      editor.setValue(code);
    }
  });

});
