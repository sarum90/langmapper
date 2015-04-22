# This query is designed to be run against
# "Larry's data with Longitude/Latitude | fulldata" at:
# http://mewert-langmap.appspot.com/map?1onlw3HTjsXX_1dSnJS9RscD1-6uW8jN_GsSQ6HCSje0/oa4lgf8
#
# The main dependencies this has on that data set is that it expects a column
# named 'continent' and only maps the languages on continent 1 (Africa).
# It also will use the column 'Language' to name the language if it is not on
# glottolog.org.


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
            break;
    
# The main process argument.
def process(record, glotto):
    # Remove non-African data:
    if record.get('continent') != 1:
        return None
    
    # Base output info:
    output = {
        'name': get_name(glotto) or 'No Glotto: ' + record.get('language'),
        'longitude': glotto.get('longitude'),
        'latitude': glotto.get('latitude')
        }
    
    # Assign the family above.
    assign_family(output, glotto)
    return output

# Generate the key algorithmically from the VALID_FAMILIES at the top of the
# file. Sorted alphabetically for the viewer's convenience.
def key():
    keys = []
    for name, attributes in VALID_FAMILIES:
        keys.append((attributes.get('letter'), name))
    return {
        'name': 'African Languages by Family',
        'key': sorted(keys)
        }

