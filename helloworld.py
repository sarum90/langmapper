import webapp2
import jinja2

import os

import json
import sheetloader
import string
from pyglottolog.glottodata import GlottoData

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

db = GlottoData()
glotto_by_iso = {}

for lang in db.GetLanguages():
  glotto_by_iso[lang.get('hid')] = lang

def ISOColumn(data):
  results = {}
  for d in data:
    for k, v in d.iteritems():
      if v and type(v) is str and len(v) == 3:
        val = results.get(k, 0)
        results[k] = val + 1
  results_ordered = sorted(results.iteritems(), lambda x, y: y[1] - x[1])
  return results_ordered[0][0]

def GetGlottoData(data):
  results = []
  key = ISOColumn(data)
  print key
  for d in data:
    results.append(glotto_by_iso.get(string.lower(str(d.get(key))), {}))
  return results
 
class SheetsPage(webapp2.RequestHandler):
    def get(self):
        sheets = sheetloader.GetAllWorksheets()
        template = JINJA_ENVIRONMENT.get_template('spreadsheets.html')
        self.response.headers['Content-Type'] = 'text/html'
        self.response.write(template.render({'sheets': sheets}))

class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.write('Hello, World!')

class SpreadsheetData(webapp2.RequestHandler):
    def get(self, sheet, worksheet):
        self.response.headers['Content-Type'] = 'application/json'
        sheet = sheetloader.GetWorksheetDictsByIds(sheet, worksheet)
        data = {
            'sheet': sheet,
            'glotto': GetGlottoData(sheet),
          }
        self.response.write(json.dumps(data))

application = webapp2.WSGIApplication([
    ('/', SheetsPage),
    ('/sheets', SheetsPage),
    ('/([^/]*)/([^/]*)/data.json', SpreadsheetData),
], debug=True)
