import webapp2
import jinja2

import os

import json
import pickle
import sheetloader
import string

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

glotto_by_iso = {}
glotto_by_glottocode = {}

with open('glottodata.pickle', 'r') as f:
  data = pickle.load(f)
  glotto_by_iso = data
  glotto_by_glottocode = data

def ISOColumn(data):
  results = {}
  for d in data:
    for k, v in d.iteritems():
      if v and type(v) is str and len(v) == 3:
        val = results.get(k, 0)
        results[k] = val + 1
  results_ordered = sorted(results.iteritems(), lambda x, y: y[1] - x[1])
  if not results_ordered:
    return None
  if not results_ordered[0]:
    return None
  return results_ordered[0][0]

def GetGlotoDataForLanguage(isocode):
  glottodata = glotto_by_iso.get(string.lower(str(isocode)), {})
  glotto_id = glottodata.get('id')
  if glotto_id:
    glottodata['genetics'] = GetSaveGenetics(glotto_id)
  return glottodata

def GetGlottoData(data):
  results = []
  key = ISOColumn(data)
  if key:
    for d in data:
      results.append(GetGlotoDataForLanguage(d.get(key)))
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
