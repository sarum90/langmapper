from oauth2client.client import SignedJwtAssertionCredentials

import httplib2
import xml.etree.ElementTree as ET
import re
import math

client_email = '489541795175-qu1ub95lv6fj41hiim01f1bdccqo17c8@developer.gserviceaccount.com'
scope = ['https://spreadsheets.google.com/feeds', 'https://docs.google.com/feeds']

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
  #print response
  return ET.fromstring(response)

def GetWorkSheetsById():
  xml = GetXML(
      'https://spreadsheets.google.com/feeds/spreadsheets/private/full')
  worksheets_by_id = {}
  for entry in xml.findall('ns0:entry', namespaces):
    id_url = entry.find('ns0:id', namespaces).text
    id = id_url.split('/')[-1]
    worksheetfeed = None
    for link in entry.findall('ns0:link', namespaces):
      if (link.attrib.get('rel') ==
          'http://schemas.google.com/spreadsheets/2006#worksheetsfeed'):
        worksheetfeed = link.attrib.get('href')
    worksheets_by_id[id] = {'feed': worksheetfeed,
                            'title': entry.find('ns0:title', namespaces).text,
                            'author': entry.find('ns0:author', namespaces).find('ns0:name', namespaces).text}
  return worksheets_by_id

def GetWorkSheetsForSpreadsheetId(spread_id):
  return GetWorkSheetsById().get(spread_id, None)

def GetWorksheetsFor(spread_id):
  wsf = GetWorkSheetsForSpreadsheetId(spread_id)
  if not wsf:
    return None
  xml = GetXML(wsf.get('feed'))
  retval = {}
  for entry in xml.findall('ns0:entry', namespaces):
    title = entry.find('ns0:title', namespaces).text
    idurl = entry.find('ns0:id', namespaces).text
    littlehash = idurl.split('/')[-1]
    feed = entry.find("ns0:link"
          "[@rel='http://schemas.google.com/spreadsheets/2006#listfeed']",
          namespaces).attrib.get('href', None)
    retval[littlehash] = {'feed': feed,
                          'title': title}
  return retval

def GetWorksheetListFeed(spread_id, worksheet_name):
  wsf = GetWorkSheetsForSpreadsheetId(spread_id)
  if not wsf:
    return None
  xml = GetXML(wsf.get('feed'))
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
  

HEADER_NS = 'http://schemas.google.com/spreadsheets/2006/extended'
def GetWorksheetDictsInternal(list_feed):
  if not list_feed:
    return None
  xml = GetXML(list_feed)
  results = []
  for entry in xml.findall('ns0:entry', namespaces):
    obj = {}
    for field in entry.findall('*', namespaces):
      myns = '{%s}' % HEADER_NS
      if myns in field.tag:
        obj[field.tag[len(myns):]] = ToNumberIfPossible(field.text)
    results.append(obj)
  return results

def GetWorksheetDicts(spread_id, worksheet_name):
  list_feed = GetWorksheetListFeed(
      '1onlw3HTjsXX_1dSnJS9RscD1-6uW8jN_GsSQ6HCSje0', 'fulldata')
  return GetWorksheetDictsInternal(list_feed)

WORKSHEET_URL = 'https://spreadsheets.google.com/feeds/list/%s/%s/private/values'
def GetWorksheetDictsByIds(spread_id, worksheet_id):
  list_feed = WORKSHEET_URL % (spread_id, worksheet_id)
  return GetWorksheetDictsInternal(list_feed)

def GetAllWorksheets():
  sheets = GetWorkSheetsById()
  for k, v in sheets.iteritems():
    v['worksheets'] = GetWorksheetsFor(k)
  return sheets
