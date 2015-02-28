import gspread

def GetSheetAsDicts():
  gc = gspread.authorize(credentials)
  sheet = gc.open_by_key('1onlw3HTjsXX_1dSnJS9RscD1-6uW8jN_GsSQ6HCSje0')
  fulldata = sheet.sheet1

  def GetCells(row_col_1, row_col_2):
    row_1, col_1 = row_col_1
    row_2, col_2 = row_col_2
    cell1 = fulldata.get_addr_int(row_1, col_1)
    cell2 = fulldata.get_addr_int(row_2, col_2)
    return fulldata.range('%s:%s' % (cell1, cell2))

  all_data = []
  CHUNK=500
  for i in xrange(1, fulldata.row_count, CHUNK):
    print "%d/%d" % (i, fulldata.row_count)
    cells = GetCells((i, 1), (min(i+CHUNK-1, fulldata.row_count),
                              fulldata.col_count))
    all_data.extend(cells)

  columns = fulldata.col_count
  rows = fulldata.row_count
  fields = []
  for i in xrange(columns):
    fields.append(all_data[i].value)

  data = []
  for i in xrange(1, rows):
    row = {}
    for j in xrange(columns):
      cell_number = i*columns + j
      value = all_data[cell_number].value
      if value:
        row[fields[j]] = value
    data.append(row)

  return data

