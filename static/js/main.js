
$(document).ready( function () {

  var africafams = {name: 'African Languages by Family',
                    code: 'Loading... re-select in a few seconds.'};
  $.get("snippets/africafams.py", function( data ) {
    africafams.code = data;
  });

  var africalevelsurfacetones = {
    name: 'African Languages Colored by Count of Level Surface Tones',
    code: 'Loading... re-select in a few seconds.'
  };
  $.get("snippets/africalevelsurfacetones.py", function(data) {
    africalevelsurfacetones.code = data;
  });

  var africadownsteptones = {
    name: 'African Languages colored by Downstep Tones',
    code: 'Loading... re-select in a few seconds.'
  };
  $.get("snippets/africadownstep.py", function(data) {
    africadownsteptones.code = data;
  });

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

  function escapeCsv(string) {
    if (string == null) {
      return "";
    }
    return String(string).replace(/"/g, '""');
  }

  function SetTable(data) {
    data_ro = data[0]
    cols = []
    for(k in data_ro) {
      cols.push(k);
    }
    var header_row_html = '<tr>';
    var header_row_csv = '';
    for (var i = 0; i < cols.length; i++) {
      header_row_html += '<th>';
      header_row_html += escapeHtml(cols[i]);
      header_row_html += '</th>';

      header_row_csv += '"';
      header_row_csv += escapeCsv(cols[i]);
      header_row_csv += '"';
      if (i + 1 < cols.length) {
        header_row_csv += ',';
      }
    }
    header_row_html += '</tr>';
    
    var table = $('#data_table');
    var table_html = header_row_html;
    var csv_data = header_row_csv;

    for(var i=0; i < data.length; i++) {
      row = '<tr>';
      var csv_row = '';
      for (var j = 0; j < cols.length; j++) {
        var obj = data[i][cols[j]];
        if (typeof obj == 'object' &&
            obj != null &&
            !(obj instanceof Array)) {
          obj = JSON.stringify(obj);
        }
        row += '<td>';
        row += escapeHtml(obj);
        row += '</td>';

        csv_row += '"';
        csv_row += escapeCsv(obj);
        csv_row += '"';
        if (j + 1 < cols.length) {
          csv_row += ',';
        }
      }
      row += '</tr>';
      table_html += row;
      csv_data += '\r\n'; // according to wikipedia, this is standard for csv.
      csv_data += csv_row;
    }
    table.html(table_html);
    window.csv_data = csv_data;
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
  editor.$blockScrolling = Infinity;

  function getPythonFunction(fun_name) {
      var prog = editor.getValue();
      localStorage.setItem("python", prog);
      $('#stdout').text('');
      $('#stderr').text('');
      Sk.configure({output:outf});
      var output = null;
      try {
          var module = Sk.importMainWithBody("<stdin>", false, prog);
          var funct = module.tp$getattr(fun_name);
          return funct
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

  function runPythonOn(funct) {
      if (funct == null)
        return null;
      var output = null;
      var input = arguments[1];
      var glotto_input = arguments[2];
      try {
          args = [funct];
          for(var i = 1; i < arguments.length; i++) {
            args.push(Sk.ffi.remapToPy(arguments[i]));
          }
          var ret = Sk.misceval.callsim.apply(Sk.misceval, args);
          output = Sk.ffi.remapToJs(ret);
      } catch (e) {
          var in_string = null;
          try {
            in_string = JSON.stringify(input, null, 4);
            in_string += " and glotto data: "
            in_string += JSON.stringify(glotto_input, null, 4);
          } catch (c) {}
          var error = e ;
          if (in_string) {
            error += '\n With input: ' + in_string;
          }
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
    var f = getPythonFunction('process');
    output = runPythonOn(f,
                         input['record'], input['glotto']);
    if (!f) {
      old_stderr = $('#stderr').text();
      $('#stderr').text(old_stderr + 'Could not find function named process');
    }
    $('#output').text(JSON.stringify(output, null, 4));
  }
  window.runit = runit;

  var mapStyles = [
    {
      "featureType": "road",
      "stylers": [
        { "visibility": "off" }
      ]
    },{
      "featureType": "landscape",
      "stylers": [
        { "visibility": "off" }
      ]
    },{
      "featureType": "poi",
      "stylers": [
        { "visibility": "off" }
      ]
    },{
      "featureType": "administrative",
      "stylers": [
        { "weight": 0.2 }
      ]
    },{
      "elementType": "labels",
      "stylers": [
        { "lightness": 65 }
      ]
    }
  ];


  var mapOptions = {
    center: { lat: 0, lng: 0},
    zoom: 2,
    styles: mapStyles
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

  function setMarker(latitude, longitude, name, c, symbol) {
    latlng = { lat: latitude, lng: longitude};
    //var marker = new google.maps.Marker({
    //    position: latlng,
    //    map: map,
    //    title: name
    //});
    svg_path = google.maps.SymbolPath.CIRCLE;
    scale = 5;
    stroke_weight = 0;
    if (symbol in letter_paths) {
      svg_path = letter_paths[symbol];
      scale = 0.01;
      stroke_weight = 1;
    }
   var color = processColor(c);
    var bgmarker = new google.maps.Marker({
      position: latlng,
      icon: {
        path: svg_path,
        scale: scale,
        fillColor: 'white',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeOpacity: 1,
        strokeWeight: stroke_weight * 3.0,
      },
      map: map,
      title: name
    });
    var marker = new google.maps.Marker({
      position: latlng,
      icon: {
        path: svg_path,
        scale: scale,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: color,
        strokeOpacity: 1,
        strokeWeight: stroke_weight,
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
    markers.push(bgmarker);
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
      var symbol = point['symbol'];
      setMarker(latitude, longitude, name, color, symbol);
    }
  }


  function filtertable() {
    var filtered_data = []
    var f = getPythonFunction('process');
    var keyf = getPythonFunction('key');
    if (!f) {
      old_stderr = $('#stderr').text();
      $('#stderr').text(old_stderr + 'Could not find function named process');
    }
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
    window.filtered_data = filtered_data;
    var map_key_html = '';
    if (keyf) {
      var key = runPythonOn(keyf);
      try {
        map_key_html += '<div class="mapkey">';
        map_key_html += '<h4 class="mapkeyname">' + escapeHtml(key.name) + '</h4>';
        map_key_html += '<ul>';
        for (var i = 0; i < key.key.length; i++) {
          var item = key.key[i];
          map_key_html += '<li>';
          symbol = item[0]
          if(typeof symbol == "string") {
            map_key_html += '<div class="keysymbol">';
            map_key_html += '<b>' + escapeHtml(symbol) + '</b>'
            map_key_html += '</div>';
          } else {
            map_key_html += '<div class="swatch" style="background-color:';
            map_key_html += processColor(symbol);
            map_key_html += '"></div>';
          }
          map_key_html += escapeHtml(item[1]);
          map_key_html += '</li>';
        }
        map_key_html += '</ul>';
        map_key_html += '</div>';
      } catch (e) {
          var error = 'Error formatting key:\n' + e
          var old_stderr = $('#stderr').text();
          $('#stderr').text(old_stderr + error);
      }
    }
    $('#map-key').html(map_key_html)
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
    "tut1": {
      name: "Tutorial 1: A New Interface",
      code: "" +
        "def process(record, glotto):\n" +
        "    return record\n"
    },
    "tut2": {
      name: "Tutorial 2: Cleaning the Data",
      code: "" +
        "remapping = {\n" +
        "      'letteranimalthatisalsoalanguageisocode': 'iso',\n" +
        "      'sizeoftheanimal': 'size',\n" +
        "      'whywouldsomeoneraiseorowntheanimal': 'uses'\n" +
        "  }\n" +
        "\n" +
        "def remap(record):\n" +
        "    result = {}\n" +
        "    for k in record:\n" +
        "        if k in remapping:\n" +
        "            result[remapping[k]] = record[k]\n" +
        "    return result\n" +
        "\n" +
        "def process(record, glotto):\n" +
        "    result = remap(record)\n" +
        "    result['uses'] = [] if not result['uses'] else result['uses'].split(',')\n" +
        "    result['num_uses'] = len(result['uses'])\n" +
        "    return result\n"
    },
    "tut3": {
      name: "Tutorial 3: Maps",
      code: "" +
        "remapping = {\n" +
        "      'letteranimalthatisalsoalanguageisocode': 'iso',\n" +
        "      'sizeoftheanimal': 'size',\n" +
        "      'whywouldsomeoneraiseorowntheanimal': 'uses'\n" +
        "  }\n" +
        "\n" +
        "def remap(record):\n" +
        "    result = {}\n" +
        "    for k in record:\n" +
        "        if k in remapping:\n" +
        "            result[remapping[k]] = record[k]\n" +
        "    return result\n" +
        "\n" +
        "def process(record, glotto):\n" +
        "    result = remap(record)\n" +
        "    result['uses'] = [] if not result['uses'] else result['uses'].split(',')\n" +
        "    result['num_uses'] = len(result['uses'])\n" +
        "    result['longitude'] = glotto.get('longitude')\n" +
        "    result['latitude'] = glotto.get('latitude')\n" +
        "    result['name'] = glotto.get('name').get('name')\n" +
        "    return result\n"
    },
    "tut4": {
      name: "Tutorial 4: Filtering",
      code: "" +
        "remapping = {\n" +
        "      'letteranimalthatisalsoalanguageisocode': 'iso',\n" +
        "      'sizeoftheanimal': 'size',\n" +
        "      'whywouldsomeoneraiseorowntheanimal': 'uses'\n" +
        "  }\n" +
        "\n" +
        "def remap(record):\n" +
        "    result = {}\n" +
        "    for k in record:\n" +
        "        if k in remapping:\n" +
        "            result[remapping[k]] = record[k]\n" +
        "    return result\n" +
        "\n" +
        "def process(record, glotto):\n" +
        "    if not glotto or 'latitude' not in glotto:\n" +
        "        return None\n" +
        "    result = remap(record)\n" +
        "    result['uses'] = [] if not result['uses'] else result['uses'].split(',')\n" +
        "    result['num_uses'] = len(result['uses'])\n" +
        "    result['longitude'] = glotto.get('longitude')\n" +
        "    result['latitude'] = glotto.get('latitude')\n" +
        "    result['name'] = glotto.get('name').get('name')\n" +
        "    return result\n"
    },
    "tut5": {
      name: "Tutorial 5: Colors",
      code: "" +
        "remapping = {\n" +
        "      'letteranimalthatisalsoalanguageisocode': 'iso',\n" +
        "      'sizeoftheanimal': 'size',\n" +
        "      'whywouldsomeoneraiseorowntheanimal': 'uses'\n" +
        "  }\n" +
        "  \n" +
        "red = [170, 0, 0]\n" +
        "green = [0, 170, 0]\n" +
        "blue = [0, 0, 170]\n" +
        "\n" +
        "def setColor(result):\n" +
        "    size = result['size']\n" +
        "    if size == 'Small':\n" +
        "        result['color'] = red\n" +
        "    elif size == 'Medium':\n" +
        "        result['color'] = green\n" +
        "    else:\n" +
        "        result['color'] = blue\n" +
        "\n" +
        "def remap(record):\n" +
        "    result = {}\n" +
        "    for k in record:\n" +
        "        if k in remapping:\n" +
        "            result[remapping[k]] = record[k]\n" +
        "    return result\n" +
        "\n" +
        "def process(record, glotto):\n" +
        "    if not glotto or 'latitude' not in glotto:\n" +
        "        return None\n" +
        "    result = remap(record)\n" +
        "    result['uses'] = [] if not result['uses'] else result['uses'].split(',')\n" +
        "    result['num_uses'] = len(result['uses'])\n" +
        "    result['longitude'] = glotto.get('longitude')\n" +
        "    result['latitude'] = glotto.get('latitude')\n" +
        "    result['name'] = glotto.get('name').get('name')\n" +
        "    setColor(result)\n" +
        "    return result\n"
    },
    "tut6": {
      name: "Tutorial 6: Adding a Map Key",
      code: "" +
        "remapping = {\n" +
        "      'letteranimalthatisalsoalanguageisocode': 'iso',\n" +
        "      'sizeoftheanimal': 'size',\n" +
        "      'whywouldsomeoneraiseorowntheanimal': 'uses'\n" +
        "  }\n" +
        "  \n" +
        "red = [170, 0, 0]\n" +
        "green = [0, 170, 0]\n" +
        "blue = [0, 0, 170]\n" +
        "\n" +
        "def setColor(result):\n" +
        "    size = result['size']\n" +
        "    if size == 'Small':\n" +
        "        result['color'] = red\n" +
        "    elif size == 'Medium':\n" +
        "        result['color'] = green\n" +
        "    else:\n" +
        "        result['color'] = blue\n" +
        "\n" +
        "def remap(record):\n" +
        "    result = {}\n" +
        "    for k in record:\n" +
        "        if k in remapping:\n" +
        "            result[remapping[k]] = record[k]\n" +
        "    return result\n" +
        "\n" +
        "def process(record, glotto):\n" +
        "    if not glotto or 'latitude' not in glotto:\n" +
        "        return None\n" +
        "    result = remap(record)\n" +
        "    result['uses'] = [] if not result['uses'] else result['uses'].split(',')\n" +
        "    result['num_uses'] = len(result['uses'])\n" +
        "    result['longitude'] = glotto.get('longitude')\n" +
        "    result['latitude'] = glotto.get('latitude')\n" +
        "    result['name'] = glotto.get('name').get('name')\n" +
        "    setColor(result)\n" +
        "    return result\n" +
        "\n" +
        "def key():\n" +
        "    return {\n" +
        "          'name': 'Size of Animal',\n" +
        "          'key': [\n" +
        "                 (red, 'Small'),\n" +
        "                 (green, 'Medium'),\n" +
        "                 (blue, 'Large')\n" +
        "              ]\n" +
        "        }\n"
    },
    "tut7": {
      name: "Tutorial 7: Working with Language Genetics",
      code: "" +
        "remapping = {\n" +
        "      'letteranimalthatisalsoalanguageisocode': 'iso',\n" +
        "      'sizeoftheanimal': 'size',\n" +
        "      'whywouldsomeoneraiseorowntheanimal': 'uses'\n" +
        "  }\n" +
        "  \n" +
        "red = [170, 0, 0]\n" +
        "green = [0, 170, 0]\n" +
        "blue = [0, 0, 170]\n" +
        "\n" +
        "def setColor(result):\n" +
        "    size = result['size']\n" +
        "    if size == 'Small':\n" +
        "        result['color'] = red\n" +
        "    elif size == 'Medium':\n" +
        "        result['color'] = green\n" +
        "    else:\n" +
        "        result['color'] = blue\n" +
        "\n" +
        "def setSymbol(result):\n" +
        "    genetics = result['genetics']\n" +
        "    if 'Indo-European' in genetics:\n" +
        "        result['symbol'] = 'E'\n" +
        "    elif 'Malayo-Polynesian' in genetics:\n" +
        "        result['symbol'] = 'P'\n" +
        "\n" +
        "def remap(record):\n" +
        "    result = {}\n" +
        "    for k in record:\n" +
        "        if k in remapping:\n" +
        "            result[remapping[k]] = record[k]\n" +
        "    return result\n" +
        "\n" +
        "def getParentList(glotto):\n" +
        "    result = [glotto.get('name').get('name')]\n" +
        "    current = glotto\n" +
        "    while 'parent' in current:\n" +
        "        current = current.get('parent')\n" +
        "        result.append(current.get('name').get('name'))\n" +
        "    return result\n" +
        "\n" +
        "def process(record, glotto):\n" +
        "    if not glotto or 'latitude' not in glotto:\n" +
        "        return None\n" +
        "    result = remap(record)\n" +
        "    result['uses'] = [] if not result['uses'] else result['uses'].split(',')\n" +
        "    result['num_uses'] = len(result['uses'])\n" +
        "    result['longitude'] = glotto.get('longitude')\n" +
        "    result['latitude'] = glotto.get('latitude')\n" +
        "    result['name'] = glotto.get('name').get('name')\n" +
        "    result['genetics'] = getParentList(glotto)\n" +
        "    setColor(result)\n" +
        "    setSymbol(result)\n" +
        "    return result\n" +
        "\n" +
        "def key():\n" +
        "    return {\n" +
        "          'name': 'Size of Animal',\n" +
        "          'key': [\n" +
        "                 (red, 'Small'),\n" +
        "                 (green, 'Medium'),\n" +
        "                 (blue, 'Large'),\n" +
        "                 ('E', 'Indo-European'),\n" +
        "                 ('P', 'Malayo-Polynesian')\n" +
        "              ]\n" +
        "        }\n"
    },
    "dia": {
      name: "Gradient coloring by number of dialects",
      code: "" +
        'def normalize(color):\n' +
        '  """Cleans color values ensuring all numbers are ints between 0-255."""\n' +
        '  cap = lambda x: int(min(255, max(0, x)))\n' +
        '  return (cap(color[0]), cap(color[1]), cap(color[2]))\n' +
        '\n' +
        'white = (255, 255, 255)\n' +
        '\n' +
        '# Large gradient array from red to white.\n' +
        'red_to_white = [normalize((170 + x*0.5, x, x)) for x in xrange(255)] + [white]\n' +
        '\n' +
        'def reduce_color_array(colors, newlength):\n' +
        '  """Reduces an arbitrary long array to an array of length newlength.\n' +
        '\n' +
        '  This is done by evenly sampling accross the existing array. This is useful\n' +
        '  for taking an extremely high resolution gradient color array and selecting\n' +
        '  only newlength colors for binning dots along that spectrum.\n' +
        '\n' +
        '  Args:\n' +
        '    colors: The input high-resoution gradient array of colors.\n' +
        '    newlength: The number of colors it should be reduced to.\n' +
        '\n' +
        '  Returns:\n' +
        '    A new array of colors that is of length newlength, sampled from input\n' +
        '    colors.\n' +
        '  """\n' +
        '  if newlength == 1:\n' +
        '    return [colors[0]]\n' +
        '  retval = []\n' +
        '  x = 0.0\n' +
        '  for i in xrange(newlength-1):\n' +
        '    retval.append(colors[int(x)])\n' +
        '    x += float(len(colors)/float(newlength-1))\n' +
        '  retval.append(colors[-1])\n' +
        '  return retval\n' +
        '\n' +
        'def get_bincolor(value, colors, binlines):\n' +
        '  """Determine the color based on a specific value.\n' +
        '  \n' +
        '  Given a value, a gradient color array, and binning thresholds, this function\n' +
        '  determines the color something should be based on the value passed in. As an\n' +
        '  example:\n' +
        '\n' +
        '  get_bincolor(0, red_to_white_gradient_array, [2, 6]) # should return red\n' +
        '  get_bincolor(3, red_to_white_gradient_array, [2, 6]) # should return pink\n' +
        '  get_bincolor(7, red_to_white_gradient_array, [2, 6]) # should return white\n' +
        '  get_bincolor(6, red_to_white_gradient_array, [2, 6]) # should return white\n' +
        '\n' +
        '  Args:\n' +
        '    value: The value to determine the color of.\n' +
        '    colors: A high-resolution gradient list of colors.\n' +
        '    binlines: A list of threshold values to bin the colors along.\n' +
        '\n' +
        '  Returns:\n' +
        '    The color for the point with the given value.\n' +
        '  """\n' +
        '  bcols = reduce_color_array(colors, len(binlines) + 1)\n' +
        '  for i in xrange(len(binlines)):\n' +
        '    if value < binlines[i]:\n' +
        '      return bcols[i]\n' +
        '  return bcols[-1]\n' +
        '\n' +
        'def make_keys(colors, binlines):\n' +
        '  """Construct key structors for describing color bins.\n' +
        '\n' +
        '  Given a high resolution gradient list, and a list of threshold values, this\n' +
        '  function constructs a list of tuples. Each tuple is in the form\n' +
        '  (color, description). Where description is a string that looks like "3-5"\n' +
        '  and describes the range of values that will be the given color if passed\n' +
        '  into get_bincolor. This is useful for constructing map keys for maps created\n' +
        '  using get_bincolor.\n' +
        '  \n' +
        '  Args:\n' +
        '    colors: A high-resolution gradient list of colors.\n' +
        '    binlines: A list of threshold values to bin the colors along.\n' +
        '\n' +
        '  Returns:\n' +
        '    A list of tuples to be used in the Map legend.\n' +
        '  """\n' +
        '  bcols = reduce_color_array(colors, len(binlines)+1)\n' +
        '  if not binlines:\n' +
        '    return [(bcols[0], "All")]\n' +
        '\n' +
        '  keys = [(bcols[0], "< %d" % binlines[0])]\n' +
        '  for i in xrange(1, len(binlines)):\n' +
        '    m = binlines[i-1]\n' +
        '    n = binlines[i]-1\n' +
        '    desc = "%d - %d" % (m, n)\n' +
        '    if m == n:\n' +
        '      desc = "%d" % m\n' +
        '    keys.append((bcols[i], desc))\n' +
        '  keys.append((bcols[-1], "%d+" % binlines[-1]))\n' +
        '  return keys\n' +
        '\n' +
        '\n' +
        'NAME = "Number of Dialects"\n' +
        'GLOTTO_KEY = "children"\n' +
        'BIN_LINES = [1, 2, 3, 4, 6, 8, 12]\n' +
        '\n' +
        'def process(unused_record, glotto):\n' +
        '  if not glotto or "latitude" not in glotto:\n' +
        '    return None\n' +
        '  val = len(glotto.get(GLOTTO_KEY, []))\n' +
        '  return {\n' +
        '      "ISO": glotto.get("iso"),\n' +
        '      "name": "%s (%d)" % (glotto.get("name").get("name"), val),\n' +
        '      GLOTTO_KEY: val,\n' +
        '      "longitude": glotto.get("longitude"),\n' +
        '      "latitude": glotto.get("latitude"),\n' +
        '      "color": get_bincolor(val, red_to_white, BIN_LINES)\n' +
        '    }\n' +
        '\n' +
        'def key():\n' +
        '  return {\n' +
        '      "name": NAME,\n' +
        '      "key": make_keys(red_to_white, BIN_LINES)\n' +
        '    }\n' +
        '\n'
    },
    'afrifams': africafams,
    'africalevelsurfacetones': africalevelsurfacetones,
    'africadownsteptones': africadownsteptones
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

  function to_csv()
  {
    if (Blob && window.csv_data) {
      var blob = new Blob([window.csv_data], {type: "text/csv;charset=utf-8"});
      saveAs(blob, "data.csv");
    } else {
      alert('Saving to CSV only works after "Map All" has been pressed ' +
            'and not on IE because IE is a sad browser.');
    }
  }
  window.to_csv = to_csv;

});


var letter_paths = {
  "A": "M 1353,-0 L 1203,-0 Q 1177,-0 1161,-13 T 1137,-46 L 1003,-392 L 360,-392 L 226,-46 Q 219,-28 202,-14 T 160,-0 L 10,-0 L 583,-1433 L 780,-1433 L 1353,-0 M 414,-532 L 949,-532 L 724,-1115 Q 702,-1169 681,-1250 Q 670,-1209 659.5,-1174.5 T 639,-1114 Z", 
  "C": "M 1184,-296 Q 1200,-296 1213,-283 L 1289,-200 Q 1201,-98 1075.5,-41 T 773,16 Q 618,16 492,-37.5 T 277,-187.5 T 139,-419 T 90,-716 T 142.5,-1013 T 290,-1245 T 517.5,-1395.5 T 810,-1449 Q 968,-1449 1082.5,-1400 T 1286,-1267 L 1223,-1178 Q 1216,-1168 1207,-1161.5 T 1181,-1155 Q 1168,-1155 1153.5,-1164.5 T 1119,-1188 T 1072,-1218 T 1008,-1248 T 922,-1271.5 T 809,-1281 Q 694,-1281 598.5,-1241.5 T 434,-1129 T 326.5,-951 T 288,-716 Q 288,-582 326.5,-477 T 431.5,-299.5 T 589,-189 T 785,-151 Q 849,-151 900,-158.5 T 994.5,-182 T 1075.5,-222.5 T 1151,-281 Q 1168,-296 1184,-296 Z", 
  "B": "M 174,-0 L 174,-1433 L 631,-1433 Q 763,-1433 858.5,-1407 T 1015.5,-1333 T 1106.5,-1215.5 T 1136,-1059 Q 1136,-1006 1119.5,-957 T 1069.5,-866 T 985.5,-791 T 867,-737 Q 1024,-706 1104,-624 T 1184,-408 Q 1184,-317 1150.5,-242 T 1052.5,-113 T 894.5,-29.5 T 681,-0 L 174,-0 L 174,-0 M 368,-653 L 368,-154 L 678,-154 Q 761,-154 820.5,-173 T 918.5,-226.5 T 975,-308.5 T 993,-413 Q 993,-524 914.5,-588.5 T 677,-653 L 368,-653 L 368,-653 M 368,-791 L 624,-791 Q 706,-791 766,-809 T 865.5,-859 T 924,-936.5 T 943,-1036 Q 943,-1162 867,-1221 T 631,-1280 L 368,-1280 L 368,-791 Z", 
  "E": "M 1057,-1433 L 1057,-1275 L 369,-1275 L 369,-799 L 926,-799 L 926,-647 L 369,-647 L 369,-158 L 1057,-158 L 1057,-0 L 174,-0 L 174,-1433 L 1057,-1433 Z", 
  "D": "M 1416,-716 Q 1416,-555 1365,-423 T 1221,-197 T 998,-51.5 T 710,-0 L 174,-0 L 174,-1433 L 710,-1433 Q 868,-1433 998,-1381.5 T 1221,-1235.5 T 1365,-1009 T 1416,-716 L 1416,-716 M 1217,-716 Q 1217,-848 1181,-952 T 1079,-1128 T 919,-1238 T 710,-1276 L 369,-1276 L 369,-157 L 710,-157 Q 825,-157 919,-195 T 1079,-304.5 T 1181,-480 T 1217,-716 Z", 
  "G": "M 813,-141 Q 871,-141 919.5,-146.5 T 1011,-163 T 1092,-189.5 T 1168,-225 L 1168,-541 L 946,-541 Q 927,-541 915.5,-552 T 904,-579 L 904,-689 L 1344,-689 L 1344,-139 Q 1290,-100 1231.5,-71 T 1106.5,-22.5 T 964,6.5 T 799,16 Q 643,16 513,-37.5 T 289,-187.5 T 142.5,-419 T 90,-716 Q 90,-880 141.5,-1015 T 288.5,-1246.5 T 519.5,-1396 T 823,-1449 Q 908,-1449 981,-1436.5 T 1116.5,-1400.5 T 1232,-1343.5 T 1331,-1268 L 1276,-1180 Q 1259,-1153 1232,-1153 Q 1216,-1153 1197,-1164 Q 1172,-1178 1141,-1198 T 1065.5,-1236.5 T 960.5,-1268 T 817,-1281 Q 696,-1281 598,-1241.5 T 431,-1128.5 T 325,-950.5 T 288,-716 Q 288,-580 326.5,-473.5 T 435,-293 T 601,-180 T 813,-141 Z", 
  "F": "M 1057,-1433 L 1057,-1275 L 369,-1275 L 369,-774 L 957,-774 L 957,-616 L 369,-616 L 369,-0 L 174,-0 L 174,-1433 L 1057,-1433 Z", 
  "I": "M 404,-0 L 210,-0 L 210,-1433 L 404,-1433 L 404,-0 Z", 
  "H": "M 1336,-0 L 1141,-0 L 1141,-652 L 369,-652 L 369,-0 L 174,-0 L 174,-1433 L 369,-1433 L 369,-794 L 1141,-794 L 1141,-1433 L 1336,-1433 L 1336,-0 Z", 
  "K": "M 387,-805 L 460,-805 Q 498,-805 520.5,-814.5 T 563,-847 L 1040,-1387 Q 1062,-1412 1082.5,-1422.5 T 1135,-1433 L 1300,-1433 L 754,-816 Q 733,-793 714.5,-777 T 675,-751 Q 703,-742 724,-724 T 768,-679 L 1338,-0 L 1170,-0 Q 1151,-0 1138,-3 T 1115.5,-11 T 1098,-24 T 1082,-41 L 587,-610 Q 576,-622 566.5,-630.5 T 544.5,-645 T 515.5,-653.5 T 475,-656 L 387,-656 L 387,-0 L 194,-0 L 194,-1433 L 387,-1433 L 387,-805 Z", 
  "J": "M 713,-495 Q 713,-375 683.5,-280 T 596.5,-119.5 T 455,-19 T 262,16 Q 165,16 60,-12 Q 62,-41 65,-69.5 T 71,-126 Q 73,-143 83.5,-153.5 T 115,-164 Q 133,-164 163,-155 T 243,-146 Q 309,-146 360.5,-166 T 447.5,-228 T 501.5,-335.5 T 520,-491 L 520,-1433 L 713,-1433 L 713,-495 Z", 
  "M": "M 879,-518 Q 893,-494 903.5,-467.5 T 924,-414 Q 934,-442 945,-467.5 T 970,-519 L 1455,-1400 Q 1468,-1423 1482,-1428 T 1522,-1433 L 1665,-1433 L 1665,-0 L 1495,-0 L 1495,-1053 Q 1495,-1074 1496,-1098 T 1499,-1147 L 1008,-251 Q 983,-206 938,-206 L 910,-206 Q 865,-206 840,-251 L 338,-1150 Q 341,-1124 342.5,-1099 T 344,-1053 L 344,-0 L 174,-0 L 174,-1433 L 317,-1433 Q 343,-1433 357,-1428 T 384,-1400 L 879,-518 M 879,-518 L 879,-518 Z", 
  "L": "M 368,-163 L 988,-163 L 988,-0 L 174,-0 L 174,-1433 L 368,-1433 L 368,-163 Z", 
  "O": "M 1505,-716 Q 1505,-555 1454,-420.5 T 1310,-189 T 1086.5,-38.5 T 798,15 T 510,-38.5 T 287,-189 T 143,-420.5 T 92,-716 T 143,-1011.5 T 287,-1243.5 T 510,-1395 T 798,-1449 T 1086.5,-1395 T 1310,-1243.5 T 1454,-1011.5 T 1505,-716 L 1505,-716 M 1306,-716 Q 1306,-848 1270,-953 T 1168,-1130.5 T 1008,-1242 T 798,-1281 Q 683,-1281 589,-1242 T 428.5,-1130.5 T 326,-953 T 290,-716 T 326,-479.5 T 428.5,-302.5 T 589,-191.5 T 798,-153 Q 914,-153 1008,-191.5 T 1168,-302.5 T 1270,-479.5 T 1306,-716 Z", 
  "N": "M 274,-1433 Q 300,-1433 312.5,-1426.5 T 341,-1400 L 1171,-320 Q 1168,-346 1167,-370.5 T 1166,-418 L 1166,-1433 L 1336,-1433 L 1336,-0 L 1238,-0 Q 1215,-0 1199.5,-8 T 1169,-35 L 340,-1114 Q 342,-1089 343,-1065 T 344,-1021 L 344,-0 L 174,-0 L 174,-1433 L 274,-1433 M 274,-1433 L 274,-1433 Z", 
  "Q": "M 1505,-716 Q 1505,-615 1484.5,-524 T 1425,-354.5 T 1330,-212 T 1204,-101 L 1572,296 L 1412,296 Q 1376,296 1348,286 T 1297,251 L 1045,-23 Q 988,-5 926.5,5 T 798,15 Q 640,15 510,-38.5 T 287,-189 T 143,-420.5 T 92,-716 T 143,-1011.5 T 287,-1243.5 T 510,-1395 T 798,-1449 T 1086.5,-1395 T 1310,-1243.5 T 1454,-1011.5 T 1505,-716 L 1505,-716 M 1306,-716 Q 1306,-848 1270,-953 T 1168,-1130.5 T 1008,-1242 T 798,-1281 Q 683,-1281 589,-1242 T 428.5,-1130.5 T 326,-953 T 290,-716 T 326,-479.5 T 428.5,-302.5 T 589,-191.5 T 798,-153 Q 914,-153 1008,-191.5 T 1168,-302.5 T 1270,-479.5 T 1306,-716 Z", 
  "P": "M 387,-536 L 387,-0 L 194,-0 L 194,-1433 L 617,-1433 Q 753,-1433 853.5,-1401.5 T 1020,-1312 T 1118.5,-1172 T 1151,-989 Q 1151,-889 1116,-806 T 1013.5,-663 T 846,-569.5 T 617,-536 L 387,-536 L 387,-536 M 387,-690 L 617,-690 Q 700,-690 763.5,-712 T 870,-773.5 T 935,-868 T 957,-989 Q 957,-1126 872.5,-1203 T 617,-1280 L 387,-1280 L 387,-690 Z", 
  "S": "M 908,-1209 Q 899,-1194 889,-1186.5 T 863,-1179 Q 846,-1179 823.5,-1196 T 766.5,-1233.5 T 683.5,-1271 T 566,-1288 Q 501,-1288 451,-1270.5 T 367.5,-1223 T 317,-1152.5 T 300,-1065 Q 300,-1005 329.5,-965.5 T 407.5,-898 T 517.5,-849.5 T 643.5,-807 T 769.5,-757.5 T 879.5,-688 T 957.5,-585 T 987,-435 Q 987,-341 955,-258.5 T 861.5,-115 T 710.5,-19 T 507,16 Q 368,16 253.5,-34.5 T 58,-171 L 114,-263 Q 122,-274 133.5,-281.5 T 159,-289 Q 180,-289 207,-266.5 T 274.5,-217 T 372.5,-167.5 T 513,-145 Q 582,-145 636,-164 T 727.5,-217.5 T 785,-300 T 805,-407 Q 805,-472 775.5,-513.5 T 698,-583 T 588.5,-630.5 T 462.5,-670.5 T 336.5,-718 T 227,-788 T 149.5,-895.5 T 120,-1055 Q 120,-1131 149.5,-1202 T 235,-1328 T 373.5,-1416 T 563,-1449 Q 683,-1449 782,-1411 T 955,-1301 Z", 
  "R": "M 387,-598 L 387,-0 L 194,-0 L 194,-1433 L 599,-1433 Q 735,-1433 834,-1405.5 T 997.5,-1326 T 1093,-1200.5 T 1124,-1036 Q 1124,-960 1100,-894 T 1030.5,-775.5 T 919.5,-686 T 771,-630 Q 807,-609 835,-569 L 1253,-0 L 1081,-0 Q 1028,-0 1003,-41 L 631,-553 Q 614,-577 594,-587.5 T 534,-598 L 387,-598 L 387,-598 M 387,-739 L 590,-739 Q 675,-739 739.5,-759.5 T 847.5,-817.5 T 913,-907 T 935,-1022 Q 935,-1150 850.5,-1215 T 599,-1280 L 387,-1280 L 387,-739 Z", 
  "U": "M 731,-154 Q 820,-154 890,-184 T 1008.5,-268 T 1082.5,-397 T 1108,-562 L 1108,-1433 L 1301,-1433 L 1301,-562 Q 1301,-438 1261.5,-332 T 1148.5,-148.5 T 969,-27 T 731,17 T 493,-27 T 313,-148.5 T 199.5,-332 T 160,-562 L 160,-1433 L 353,-1433 L 353,-563 Q 353,-473 378.5,-398 T 452.5,-269 T 571.5,-184.5 T 731,-154 Z", 
  "T": "M 1150,-1433 L 1150,-1270 L 687,-1270 L 687,-0 L 493,-0 L 493,-1270 L 28,-1270 L 28,-1433 L 1150,-1433 Z", 
  "W": "M 14,-1433 L 175,-1433 Q 201,-1433 218,-1420 T 241,-1387 L 537,-391 Q 545,-364 551.5,-333 T 564,-268 Q 571,-302 578,-333.5 T 594,-391 L 931,-1387 Q 937,-1404 954.5,-1418.5 T 997,-1433 L 1053,-1433 Q 1079,-1433 1095.5,-1420 T 1119,-1387 L 1454,-391 Q 1472,-339 1486,-272 Q 1492,-305 1497,-335 T 1510,-391 L 1807,-1387 Q 1812,-1405 1829.5,-1419 T 1872,-1433 L 2023,-1433 L 1576,-0 L 1402,-0 L 1039,-1093 Q 1028,-1124 1019,-1165 Q 1014,-1145 1009.5,-1126.5 T 1000,-1093 L 635,-0 L 461,-0 Z", 
  "V": "M 8,-1433 L 163,-1433 Q 189,-1433 205,-1420 T 229,-1387 L 634,-376 Q 648,-342 659.5,-302 T 682,-219 Q 691,-262 701.5,-302 T 726,-376 L 1129,-1387 Q 1136,-1404 1153,-1418.5 T 1195,-1433 L 1351,-1433 L 767,-0 L 592,-0 Z", 
  "Y": "M 726,-570 L 726,-0 L 533,-0 L 533,-570 L 8,-1433 L 178,-1433 Q 204,-1433 219,-1420 T 245,-1388 L 573,-831 Q 593,-796 606.5,-765 T 631,-704 Q 642,-735 655,-766 T 688,-831 L 1015,-1388 Q 1024,-1404 1039.5,-1418.5 T 1080,-1433 L 1252,-1433 Z", 
  "X": "M 507,-736 L 34,-1433 L 227,-1433 Q 248,-1433 258,-1426 T 276,-1406 L 650,-832 Q 657,-853 671,-878 L 1024,-1402 Q 1033,-1416 1043.5,-1424.5 T 1069,-1433 L 1254,-1433 L 779,-745 L 1270,-0 L 1078,-0 Q 1056,-0 1043.5,-11.5 T 1023,-37 L 639,-638 Q 632,-617 621,-598 L 247,-37 Q 238,-23 226.5,-11.5 T 194,-0 L 14,-0 Z", 
  "Z": "M 1172,-1433 L 1172,-1361 Q 1172,-1327 1151,-1297 L 340,-158 L 1158,-158 L 1158,-0 L 86,-0 L 86,-76 Q 86,-106 105,-133 L 917,-1275 L 124,-1275 L 124,-1433 L 1172,-1433 Z"
}
