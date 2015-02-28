
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
    var header_row = $('<tr>')
    for (var i = 0; i < cols.length; i++) {
      header_cell = $("<th>").text(cols[i])
      header_row.append(header_cell)
    }
    
    var table = $('#data_table');
    table.html('');
    table.append(header_row);

    for(var i=0; i < data.length; i++) {
      row = $('<tr>')
      for (var j = 0; j < cols.length; j++) {
        cell = $("<td>").text(data[i][cols[j]]);
        row.append(cell);
      }
      table.append(row);
    }
  }

  function outf(text)
  {
      stdout = $('#stdout');
      var base_text =  stdout.text();
      stdout.text(base_text + text);
  }

  function runPythonOn(input) {
      var prog = document.getElementById("code").value;
      $('#stdout').text('');
      $('#stderr').text('');
      Sk.configure({output:outf});
      var output = null;
      try {
          var module = Sk.importMainWithBody("<stdin>", false, prog);
          var funct = module.tp$getattr('process');
          var ret = Sk.misceval.callsim(funct,
                                        Sk.ffi.remapToPy(input))
          output = Sk.ffi.remapToJs(ret);
      } catch (e) {
          var error = e + '\n With input: ' + JSON.stringify(input, null, 4)
          $('#stderr').text(error);
      }
      return output;
  }


  function runit()
  {
    var input = JSON.parse($('#input').text());
    output = runPythonOn(input);
    $('#output').text(JSON.stringify(output, null, 4));
  }
  window.runit = runit;

  function filtertable() {
    var filtered_data = []
    for(var i = 0; i < window.data.length; i++) {
      var input = window.data[i]
      var output = runPythonOn(input);
      if (output) {
        filtered_data.push(output)
      }
    }
    SetTable(filtered_data)
  }
  window.filtertable = filtertable;

  window.data = [];


  $.get('/data.json').done(function(data) {
    window.data = data;
    $("#input").text(JSON.stringify(data[0], null, 4));
  });

});
