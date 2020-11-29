FROM node:15.3.0-slim

WORKDIR /code/

ADD cli.sh /code/cli.sh
ADD .babelrc /code/.babelrc
ADD tsconfig.json /code/tsconfig.json
ADD package-lock.json /code/package-lock.json
ADD package.json /code/package.json

RUN npm install

ADD memserver-boilerplate /code/memserver-boilerplate
ADD vendor /code/vendor/
ADD scripts /code/scripts
ADD src /code/src
RUN npm run npm-link-ember-packages
RUN node_modules/.bin/tsc

ENTRYPOINT "/bin/bash"
