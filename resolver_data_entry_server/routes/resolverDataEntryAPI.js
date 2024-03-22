const express = require('express');
const {
  getDataEntryDate,
  getAllDataEntriesCount,
  getURIEntriesUsingIKeyAndGLN,
  deleteURIEntriesUsingIKey,
  addDataURIEntry,
  validateBatchURI,
  getDataEntriesByPage,
} = require('../controllers/dataEntries');
const { checkAuthHeaderInclude } = require('../middleware/auth');
const { checkWritingLock } = require('../middleware/lock');

const router = express.Router();

router.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*'); // update to match the domain you will make the request from
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  next();
});

router
  .route('/')
  .get(getDataEntryDate)
  .post(checkAuthHeaderInclude, checkWritingLock, addDataURIEntry);

router.route('/all/count').get(checkAuthHeaderInclude, getAllDataEntriesCount);
router
  .route('/:identificationKeyType/:identificationKey')
  .get(checkAuthHeaderInclude, getURIEntriesUsingIKeyAndGLN)
  .delete(checkAuthHeaderInclude, checkWritingLock, deleteURIEntriesUsingIKey);

router
  .route('/validation/batch/:batchId')
  .get(checkAuthHeaderInclude, validateBatchURI);
router
  .route('/all/page/:pageNumber/size/:pageSize')
  .get(checkAuthHeaderInclude, getDataEntriesByPage);
module.exports = router;
