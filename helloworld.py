import webapp2
import jinja2

import urllib2

import os

import json
import sheetloader
import string
from pyglottolog.glottodata import GlottoData
from google.appengine.api import files

from google.appengine.ext import ndb

_GENETICS_URL = 'http://glottolog.org/resource/languoid/id/%s.json'

def DownloadLanguageGenetics(key):
  """Downloads the language genetics for language named key."""
  url = _GENETICS_URL % key
  response = urllib2.urlopen(url)
  return response.read()

BUCKET_NAME = 'mewert-langmap.appspot.com'
BUCKET = '/gs/' + BUCKET_NAME

def _GetPathFor(glotto_key):
  return os.path.join(BUCKET, 'glotto', glotto_key)

def SaveData(glotto_key, data):
  filename = _GetPathFor(glotto_key)
  writable_file_name = files.gs.create(filename, acl='project-private')
  print "saving"
  print filename
  print writable_file_name
  with files.open(writable_file_name, 'a') as f:
    f.write(data)
  files.finalize(writable_file_name)

def GetData(glotto_key):
  filename = _GetPathFor(glotto_key)
  retvals = []
  try:
    with files.open(filename, 'r') as f:
      data = f.read(1000)
      while data:
        retvals.append(data)
        data = f.read(1000)
  except files.ExistenceError:
    print filename
    print "none?"
    return None
  return "".join(retvals)

def DownloadAndSaveLanguageGenetics(key):
  jsondata = DownloadLanguageGenetics(key)
  SaveData(key, jsondata)
  return jsondata

def LoadLanguageGenetics(key):
  return GetData(key)

def GetSaveGenetics(key):
  data = ''
  saved = LoadLanguageGenetics(key)
  if saved:
    data = saved
  else:
    data = DownloadAndSaveLanguageGenetics(key)
  return json.loads(data)


print GetSaveGenetics('byan1241')
print GetSaveGenetics('byan1241')
print "Getting"
print GetData("demo-testfile")
print "Setting"
SaveData("demo-testfile", "ohhai")
print "Getting"
print GetData("demo-testfile")
print GetSaveGenetics('byan1241')


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
