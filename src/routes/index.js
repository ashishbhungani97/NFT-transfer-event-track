const configureRoutes = (app) => {
    app.use('/api/nft', require('./api/nft'));
  };
  
  module.exports = configureRoutes;