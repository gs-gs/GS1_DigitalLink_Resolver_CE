const express = require('express');
const {
  getGCPDate,
  getAllGCPRedirect,
  getSingleGCPRedirect,
  addNewGCPRedirect,
  deleteGCPRedirect,
} = require('../controllers/gcpRedirects');
const { checkAuthHeaderInclude } = require('../middleware/auth');
const { checkWritingLock } = require('../middleware/lock');

const router = express.Router();

router
  .route('/')
  .get(getGCPDate)
  .post(checkAuthHeaderInclude, checkWritingLock, addNewGCPRedirect);

router.route('/all').get(checkAuthHeaderInclude, getAllGCPRedirect);
router
  .route('/:identificationKeyType/:gcp')
  .get(checkAuthHeaderInclude, getSingleGCPRedirect)
  .delete(checkAuthHeaderInclude, checkWritingLock, deleteGCPRedirect);

module.exports = router;
