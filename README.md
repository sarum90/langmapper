# LangMap

This is the source code for (LangMap)[http://mewert-langmap.appspot.com/].

## How to Develop:

- Download the (Python Appengine SDK)[https://cloud.google.com/appengine/downloads#Google_App_Engine_SDK_for_Python].
- Go to a terminal and clone this repository:

    cd ~/folder/you/want/to/install/this/in
    git clone git@github.com:sarum90/langmap.git

- cd into the directory you just cloned and run the dev server:

    cd langmap
    dev_appserver.py .
    # Might be `$UNZIP_LOC/google_appengine/dev_appserver.py .` on linux

- If this has errors:
  - Maybe you need to install other python packages? `sudo pip install pycrypto`
  - Something else? Ask me, I might be able to help.
- Navigate to (localhost:8080)[http://localhost:8080]
- You now have a running Langmap DevServer, click on a spreadsheet to view.
- In a separate terminal, or in a text editor like TextMate, Sublime, or
  Notepad++, edit `static/js/main.js` in you favorite editor.
  - Try adding `alert("hello world");` at the top, and save the file.
  - Refresh the page.
    - Tada, you are editting the source, no need to restart the server every
      time.
