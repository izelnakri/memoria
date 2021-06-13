FROM node:16.3.0

RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /code/

ADD tsconfig.json /code/tsconfig.json
ADD package-lock.json /code/package-lock.json
ADD package.json /code/package.json

RUN npm install

ADD packages /code/packages
ADD scripts /code/scripts
ADD test /code/test

RUN npm install && npm run libs:build

ENTRYPOINT "/bin/bash"
