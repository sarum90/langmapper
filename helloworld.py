import webapp2
import jinja2

import os

import json
import re
import pickle
import sheetloader
import string

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

glotto_by_iso = {}
glotto_by_glottocode = {}

print "Loading glottodata"
with open('glottodata.pickle', 'r') as f:
  data = pickle.load(f)
  glotto_by_iso = data
  glotto_by_glottocode = data
print "glottodata loaded"

def ISOColumn(data):
  results = {}
  glotto_results = {}
  for d in data:
    for k, v in d.iteritems():
      if v and type(v) is str and len(v) == 3:
        val = results.get(k, 0)
        results[k] = val + 1
      if (v and type(v) is str and len(v) == 8 and
          re.match(r'^[a-z]{4}\d{4}$', v)):
        val = glotto_results.get(k, 0)
        glotto_results[k] = val + 1
  results_ordered = sorted(results.iteritems(), lambda x, y: y[1] - x[1])
  glotto_results_ordered = sorted(glotto_results.iteritems(),
                                  lambda x, y: y[1] - x[1])
  iso = None
  glotto = None
  if results_ordered and results_ordered[0]:
    iso = results_ordered[0][0]
  if glotto_results_ordered and glotto_results_ordered[0]:
    glotto = glotto_results_ordered[0][0]
  if data:
    if 'iso' in data[0]:
      iso = 'iso'
    if 'glotto' in data[0]:
      glotto = 'glotto'
    if 'glottocode' in data[0]:
      glotto = 'glottocode'
  return iso, glotto

def GetGlotoDataForLanguage(glottocode, isocode):
  glottodata = None
  if (glottocode and type(glottocode) is str and len(glottocode) == 8 and
      re.match(r'^[a-z]{4}\d{4}$', glottocode)):
    glottodata = glotto_by_glottocode.get(string.lower(unicode(glottocode)), {})
  if not glottodata:
    glottodata = glotto_by_iso.get(string.lower(unicode(isocode)), {})
  current = glottodata
  while 'parent' in current:
    key = current['parent']
    if isinstance(key, dict):
      break
    parent = glotto_by_glottocode.get(key, {'key': key})
    current['parent'] = parent
    current = parent
  return glottodata

def GetGlottoData(data):
  results = []
  iso, glotto = ISOColumn(data)
  if iso or glotto:
    for d in data:
      results.append(GetGlotoDataForLanguage(d.get(glotto), d.get(iso)))
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
