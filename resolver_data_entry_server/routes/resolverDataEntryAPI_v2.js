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
