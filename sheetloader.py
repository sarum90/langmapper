from oauth2client.client import SignedJwtAssertionCredentials

import httplib2
import urllib
import xml.etree.ElementTree as ET
import json
import re
import math

client_email = '489541795175-qu1ub95lv6fj41hiim01f1bdccqo17c8@developer.gserviceaccount.com'
scope = [
    'https://spreadsheets.google.com/feeds',
    'https://docs.google.com/feeds',
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/spreadsheets.readonly"
]

with open("privatekey.pem") as f:
  private_key = f.read()
  credentials = SignedJwtAssertionCredentials(client_email, private_key, scope)

http = httplib2.Http()
http = credentials.authorize(http)

namespaces = {'ns0': "http://www.w3.org/2005/Atom",
              'ns1': "http://a9.com/-/spec/opensearchrss/1.0/",
              'ns2': "http://schemas.google.com/spreadsheets/2006"}

def GetXML(url):
  headers, response = http.request(url)
  print response
  return ET.fromstring(response)

def GetJSON(url):
  headers, response = http.request(url)
  return json.loads(response)

def GetWorkSheetsById():

  response = GetJSON(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'")
  worksheets_by_id = {}
  for entry in response.get("files", []):
      worksheets_by_id[entry.get("id")] = {
          'title': entry.get("name"),
      }
  return worksheets_by_id

def GetWorkSheetsForSpreadsheetId(spread_id):
  return GetWorkSheetsById().get(spread_id, None)

def GetWorksheetsFor(spread_id):
  url = 'https://sheets.googleapis.com/v4/spreadsheets/' + spread_id
  js = GetJSON(url)
  retval = {}
  for entry in js.get("sheets", []):
    props = entry.get("properties", {})
    title = props.get('title', '')
    sheetId = props.get('sheetId', 0)
    retval[sheetId] = {'sheetId': sheetId,
                          'title': title}
  return retval

def GetWorksheetListFeed(spread_id, worksheet_name):
  wsf = GetWorkSheetsForSpreadsheetId(spread_id)
  if not wsf:
    return None
  url = 'https://sheets.googleapis.com/v4/spreadsheets/' + wsf.get('id')
  xml = GetXML(url)
  for entry in xml.findall('ns0:entry', namespaces):
    title = entry.find('ns0:title', namespaces).text
    if title == worksheet_name:
      return entry.find("ns0:link"
          "[@rel='http://schemas.google.com/spreadsheets/2006#listfeed']",
          namespaces).attrib.get('href', None)

def ToNumberIfPossible(val):
  try:
    fval = float(val)
    if math.isnan(fval):
      return val
    return fval
  except ValueError:
    return val
  except TypeError:
    return val

def to_header(h):
    return re.sub(r'[^a-z0-9_]*', '', h.lower().replace(' ', ''))


def GetWorksheetDictsInternal(list_feed):
  if not list_feed:
    return None
  js = GetJSON(list_feed)
  headers = None
  results = []
  for row in js.get("values", []):
    if headers is None:
        headers = [to_header(r) for r in row]
        continue
    obj = {}
    for i, value in enumerate(row):
        if i < len(headers):
            obj[headers[i]] = ToNumberIfPossible(value)
    results.append(obj)
  return results

def GetWorksheetDicts(spread_id, worksheet_name):
  list_feed = GetWorksheetListFeed(
      '1onlw3HTjsXX_1dSnJS9RscD1-6uW8jN_GsSQ6HCSje0', 'fulldata')
  return GetWorksheetDictsInternal(list_feed)

WORKSHEET_URL='https://sheets.googleapis.com/v4/spreadsheets/%s/values/%s'
def GetWorksheetDictsByIds(spread_id, worksheet_id):
  wss = GetWorksheetsFor(spread_id)
  list_feed = WORKSHEET_URL % (spread_id, urllib.quote_plus(wss[int(worksheet_id)].get('title')))
  return GetWorksheetDictsInternal(list_feed)

def GetAllWorksheets():
  sheets = GetWorkSheetsById()
  for k, v in sheets.iteritems():
    v['worksheets'] = GetWorksheetsFor(k)
  return sheets
