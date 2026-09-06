echo deploying server
cd server
npm run deploy
echo deploying client
cd ..
cd client
npm run build
npm run deploy
cd ..
echo done
