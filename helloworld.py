import webapp2

import json
import sheetloader

class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.write('Hello, World!')

class SpreadsheetData(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'application/json'
        self.response.write(json.dumps(sheetloader.GetWorksheetDicts(
            '1onlw3HTjsXX_1dSnJS9RscD1-6uW8jN_GsSQ6HCSje0', 'fulldata')))

application = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/data.json', SpreadsheetData),
], debug=True)
