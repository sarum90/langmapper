def process(record):
  ids = (record.get('idsurface', '') or '').split(' ')
  if len(ids) > 4:
   return {'language': record['language'],
           'longitude': float(record['longitude'] or 0),
           'latitude': float(record['latitude'] or 0),
           'idsurface': ids}
