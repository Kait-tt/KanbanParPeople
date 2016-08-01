echo "### git pull ###"
git pull
echo "### bower install ###"
bower install --allow-root
echo "### npm install ###"
npm install
echo "### compass compile ###"
compass compile
