
import urllib2

_GET_URL = ('http://glottolog.org/glottolog/language.geojson?'
    'type=languages&'
    'sEcho=1&'
    'iSortingCols=1&'
    'iSortCol_0=0&'
    'sSortDir_0=asc&'
    'iDisplayLength=%(count)d&'
    'iDisplayStart=%(offset)d')

class Server(object):
  """Server for getting results from glottolog.org."""

  def __init__(self):
    pass
 
  def GetResults(self, start_index, count):
    """Gets the results from glottolog.org.

    Note: it has been observed that this might get fewer than 'count' results.
    It seems as if there are some entries (like entry at index 5) that cannot
    be gotten, even getting (5, 1) results in an empty list. Do not therefore
    assume that returning less than count results indicates the end of the
    database. It will be much safer to assume that an entire empty request
    indicates the end of the database.
    
    """
    url = _GET_URL % {
          'offset': start_index,
          'count': count,
        }
    response = urllib2.urlopen(url)
    return response.read()
    
