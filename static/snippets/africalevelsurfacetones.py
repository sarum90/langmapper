# This query is designed to be run against
# "Larry's data with Longitude/Latitude | fulldata" at:
# http://mewert-langmap.appspot.com/map?1onlw3HTjsXX_1dSnJS9RscD1-6uW8jN_GsSQ6HCSje0/oa4lgf8
#
# It requres a 'continent' column, a idsurfacescale column, and sometimes a
# language column.


# Array of family names and the letter to use. Note that family names must
# match families that are on glottolog.org.
VALID_FAMILIES = [
      ('Kru', {'letter': 'K' }),
      ('Gur', {'letter': 'G' }),
      ('Kwa', {'letter': 'W' }),
      ('Atlantic', {'letter': 'A' }),
      ('Mande', {'letter': 'M' }),
      ('Central Sudanic', {'letter': 'S' }),
      ('Nilotic', {'letter': 'N' }),
      ('Nubian', {'letter': 'X' }),
      ('Kainji', {'letter': 'J' }),
      ('Edoid', {'letter': 'E' }),
      ('Bantoid', {'letter': 'T' }),
      ('Igboid', {'letter': 'I' }),
      ('Chadic', {'letter': 'C'}),
      ('Cushitic', {'letter': 'H'}),
      ('Khoe-Kwadi', {'letter': 'O'}),
      
      ('Benue-Congo', {'letter': 'B' }),
      ('Volta-Congo', {'letter': 'V' }),
      ('Atlantic-Congo', {'letter': 'Z' }),
      ('Ijoid', {'letter': 'D'}),
    ]

# Utility to extract the default name from a glottolog "langoid" (language,
# language family, etc).
def get_name(struct):
    return struct.get('name', {}).get('name', '')

# Determine if the passed in family name is an ancestor of parent_struct
# recursively.
def has_parent(family_name, parent_struct):
    if get_name(parent_struct) == family_name:
        return True
    if 'parent' not in parent_struct:
        return False
    return has_parent(family_name, (parent_struct.get('parent') or {}))

# Assign the correct letter to a language for it's family based on the
# VALID_FAMILIES array at the top of the file. 
def assign_family(output, glotto):
    for (k, v) in VALID_FAMILIES:
        if has_parent(k, glotto.get('parent', {})):
            output['symbol'] = v['letter']
            break

# Turns the idsurfacescale column into a proper python array.
def get_id_surface_scale(record):
    s = record.get('idsurfacescale')
    if not s:
        return []
    return s.split(' ')

# A simple color array to use to color each of the letters.
COLORS = [[0, 0, 0],                                                            
          [0xF4, 0x43, 0x36],                                                   
          [0x9C, 0x27, 0xB0],                                                   
          [0x3F, 0x51, 0xB5],                                                   
          [0x03, 0xA9, 0xF4],                                                   
          [0x00, 0x96, 0x88]]
    
# The main process argument.
def process(record, glotto):
    # Remove non-African data:
    if record.get('continent') != 1:
        return None
    
    # Compute the number of level surface tones.
    id_surface_scale = get_id_surface_scale(record)
    levels = sum([1 for x in id_surface_scale if len(x) == 1])
    
    # Base output info:
    output = {
        # Add the number of level surface tones in parenthesis for addition info
        # while mousing over the various data points.
        'name': '%s (%d)' %
            (get_name(glotto) or 'No Glotto: ' + record.get('language'),
             levels),
        'longitude': glotto.get('longitude'),
        'latitude': glotto.get('latitude'),
        'idsurfacescale': id_surface_scale,
        'level_surface_tones': levels,
        'color': COLORS[levels]
        }
    
    # Assign the family above.
    assign_family(output, glotto)
    return output

# Generate the key algorithmically from the VALID_FAMILIES at the top of the
# file and label the different colors. Sorted alphabetically for the viewer's
# convenience.
def key():
    keys = []
    for name, attributes in VALID_FAMILIES:
        keys.append((attributes.get('letter'), name))
    keys = sorted(keys)
    for i in range(6):
        keys.append((COLORS[i], '%d number of level surface tones' % i))
    return {
        'name': 'African Languages by Family and Number of Level Surface Tones',
        'key': keys
    }

