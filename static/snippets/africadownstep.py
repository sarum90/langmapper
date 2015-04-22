# This query is designed to be run against
# "Larry's data with Longitude/Latitude | fulldata" at:
# http://mewert-langmap.appspot.com/map?1onlw3HTjsXX_1dSnJS9RscD1-6uW8jN_GsSQ6HCSje0/oa4lgf8
#
# It requres a 'continent' column, a idsurfacescale column, and sometimes a
# language column.

# A color palette blatently copied from:
#  http://www.mulinblog.com/a-color-palette-optimized-for-data-visualization/
PALETTE = {'gray'  : [0x4D, 0x4D, 0x4D],                                          
           'blue'  : [0x5D, 0xA5, 0xDA],                                          
           'orange': [0xFA, 0xA4, 0x3A],                                          
           'green' : [0x60, 0xBD, 0x68],                                          
           'pink'  : [0xF1, 0x7C, 0xB0],                                          
           'brown' : [0xB2, 0x91, 0x2F],                                          
           'purple': [0xB2, 0x76, 0xB2],                                          
           'yellow': [0xDE, 0xCF, 0x3F],                                          
           'red'   : [0xF1, 0x58, 0x54]}

# This constant is used to color the dots on the map. If a language has all of
# the values of the list in the 'idsurfacescale' column, then it will be the
# color on the right. These are processed in order and the first one that
# matches will be the color of the language dot. The final empty list will thus
# match all languages, and is just the default color.
GRAPHED_COLORS = [
    (['1', '4', '7'], PALETTE['blue']),
    (['1', '4']     , PALETTE['orange']),
    (['4', '7']     , PALETTE['green']),
    (['1', '7']     , PALETTE['pink']),
    (['1']          , PALETTE['brown']),
    (['4']          , PALETTE['purple']),
    (['7']          , PALETTE['yellow']),
    ([]             , PALETTE['gray'])]

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

# Checks if all of the passed in tones are in an array of tones
def are_tones_in_array(tones, array):
    for t in tones:
        if t not in array:
            return False
    return True

# Determines the color of a dot based on the idsurfacescale and GRAPHED_COLORS.
def get_color(idsurfacescale):
    for tones, color in GRAPHED_COLORS:
        if are_tones_in_array(tones, idsurfacescale):
            return color
    
# The main process argument.
def process(record, glotto):
    # Remove non-African data:
    if record.get('continent') != 1:
        return None
    
    # Compute the number of level surface tones.
    id_surface_scale = get_id_surface_scale(record)
    
    # Remove things that don't have any 'idsurfacescale' data (not cleaned yet).
    if not id_surface_scale:
        return None
    
    # Filter id_surface_scale to only the downsteps.
    downsteps = [x for x in id_surface_scale if x in '147']

    # Base output info:
    output = {
        # Add the downsteps in square brakets for the viewers convenience.
        'name': '%s [%s]' %
            (get_name(glotto) or 'No Glotto: ' + record.get('language'),
             ', '.join(downsteps)),
        'longitude': glotto.get('longitude'),
        'latitude': glotto.get('latitude'),
        'idsurfacescale': id_surface_scale,
        'color': get_color(id_surface_scale)
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
    for tones, color in GRAPHED_COLORS:
        if tones:
          keys.append((color, 'Has tones %s' % ', '.join(tones)))
        else:
          keys.append((color, 'Does not match other tone groups.'))
    return {
        'name': 'African Languages by Family and Downstep Tones',
        'key': keys
    }

