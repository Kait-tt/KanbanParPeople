USER=*****
IP=***.***.***.***
DIR=********
PEM=********

INIT_CMD="
mkdir ${DIR}/public
mkdir ${DIR}/logs
mkdir ${DIR}/config
forever restart 0
tail -f ${DIR}/logs/forever.log
"

SETUP_CMD="
cd ${DIR}
bower install
npm install
forever restart 0
tail -f logs/forever.log
"

<< COMOUT
ssh -i $PEM $USER@$IP "${INIT_CMD}"

scp -r -i $PEM \
    .bowerrc \
    app.js \
    batch/ \
    bin/ \
    bower.json \
    config.rb \
    lib/ \
    log4js_setting.json \
    logs/ \
    package.json \
    routes/ \
    scss/ \
    stats/ \
    views/ \
    $USER@$IP:$DIR/

scp -r -i /c/rsa/snakazawa-aws.pem \
    public/images/ \
    public/javascripts/ \
    public/stylesheets/ \
    $USER@$IP:$DIR/public
COMOUT

ssh -i $PEM $USER@$IP "${SETUP_CMD}"

