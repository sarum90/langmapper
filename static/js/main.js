
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
      try {
          args = [funct];
          for(var i = 1; i < arguments.length; i++) {
            args.push(Sk.ffi.remapToPy(arguments[i]));
          }
          var ret = Sk.misceval.callsim.apply(Sk.misceval, args);
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
          map_key_html += '<div class="swatch" style="background-color:';
          map_key_html += processColor(item[0]);
          map_key_html += '"></div>';
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
