
import os
import shutil
import json
from server import Server

_base_dir = os.path.abspath(os.path.dirname(__file__))

def _SaveTextToFile(text, filename):
  with open(filename, "w") as text_file:
    text_file.write(text)

def _ReadFile(filename):
  with open(filename, 'r') as text_file:
    return text_file.read()

def _CountResults(json_blob):
  data = json.loads(json_blob) or {}
  return len(data.get('features', []))

def _BasicLogger(logline):
  print logline

def _NopLogger(logline):
  pass

class GlottoData(object):
  """Base interface for accessing the glottolog.org data.

  Upon the first time accessing the data it will download all the data to a
  local store. After that it just returns the local snapshot of the data rather
  than hitting the server with lots of requests to download everything over and
  over."""
  def __init__(self, server=None, clear_cache=False, data_dir='data',
               logger=_BasicLogger):
    self._server = server or Server()
    self._data_dir = os.path.join(_base_dir, data_dir)
    self._snapshot_dir = os.path.join(self._data_dir, 'snapshot')
    self._download_dir = os.path.join(self._data_dir, 'download')
    self._log = logger or _NopLogger
    self._languages = None

    if clear_cache:
      self._ClearDataDirectory()

    self._SetupSnapshotDir()

  def _ClearDataDirectory(self):
    self._log('Clearing the cache at %s.' % self._data_dir)
    if os.path.exists(self._data_dir):
      shutil.rmtree(self._data_dir)

  def _ListFiles(self):
    return sorted(os.listdir(self._snapshot_dir))

  def _SetupSnapshotDir(self):
    """If it doesn't exist, create the data dir."""
    if os.path.exists(self._snapshot_dir):
      self._log('Using the local data cache at %s.' % self._data_dir)
      return
    self._log('Creating a local data cache at %s.' % self._data_dir)
    os.mkdir(self._data_dir)
    if os.path.exists(self._download_dir):
      shutil.rmtree(self._download_dir)
    os.mkdir(self._download_dir)

    done = False
    STEP_SIZE=500
    current_index = 0
    while not done:
      blob = self._server.GetResults(current_index, STEP_SIZE)
      first_index = current_index
      last_index = current_index + STEP_SIZE - 1

      filename = 'data_%05d_to_%05d.json' % (first_index, last_index)
      self._log('Downloading data for entries %d..%d' % (first_index,
                                                         last_index))
      _SaveTextToFile(blob, os.path.join(self._download_dir, filename))

      if _CountResults(blob) == 0:
        self._log('Empty results, download complete')
        done = True

      current_index += STEP_SIZE
      
    shutil.move(self._download_dir, self._snapshot_dir)

  def GetLanguages(self):
    """Returns a large list of all of the languages in the database."""
    if self._languages:
      return self._languages
    languages = []
    for filename in self._ListFiles():
      json_blob = _ReadFile(os.path.join(self._snapshot_dir, filename))
      geodata_structure = json.loads(json_blob) or {}
      languages.extend([
        x.get('properties', {}).get('language', {})
        for x in geodata_structure.get('features', [])])
    self._languages = languages
    return languages


