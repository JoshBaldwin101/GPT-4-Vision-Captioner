    @echo off
    call git pull
    call npm install
    node src/index.js
    pause
    