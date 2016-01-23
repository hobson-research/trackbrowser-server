git pull origin master
forever stop app.js
forever start -o logs/out.log -e logs/err.log app.js
