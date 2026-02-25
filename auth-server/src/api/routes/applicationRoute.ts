import { Router } from "express";
import { authenticate } from "../../middlewares";
import {getApplicationStages, updateApplicationPhase, getApplicationDocuments, getRequiredDocuments, updateStageStatus,} from "../controllers/profileController";

/**
 * @apiDefine ApplicationsGroup Applications
 * Application management and document handling
 */

/**
 * @apiDefine token Token is required in the form of Bearer token
 * @apiHeader {String} Authorization Bearer token
 * @apiHeaderExample {json} Header-Example:
 * {
 *  "Authorization": "Bearer <token>"
 * }
 */

/**
 * @apiDefine unauthorized Unauthorized
 * @apiError (401) {String} Unauthorized Missing or invalid authentication token
 * @apiErrorExample {json} Unauthorized:
 * {
 *  "message": "Unauthorized"
 * }
 */

const router = Router();

router.get(
  /**
   * @api {get} /applications/stages Get application stages
   * @apiName GetApplicationStages
   * @apiGroup ApplicationsGroup
   * @apiVersion 1.0.0
   * @apiDescription Retrieve all application stages with user progress
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiSuccess (200) {Object[]} stages List of application stages
   * @apiSuccess (200) {String} stages.id Stage unique ID
   * @apiSuccess (200) {String} stages.name Stage name
   * @apiSuccess (200) {Number} stages.order Stage order
   * @apiSuccess (200) {String} stages.status User's status for this stage
   * @apiSuccess (200) {String} stages.completedAt Completion timestamp
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  "stages": [
   *    {
   *      "id": "stage1",
   *      "name": "Application Form",
   *      "order": 1,
   *      "status": "completed",
   *      "completedAt": "2025-11-29T10:00:00.000Z"
   *    }
   *  ]
   * }
   *
   * @apiUse unauthorized
   */
  "/stages",
  authenticate,
  getApplicationStages
);

router.put(
  /**
   * @api {put} /applications/stages/:stageId Update application stage status
   * @apiName UpdateStageStatus
   * @apiGroup ApplicationsGroup
   * @apiVersion 1.0.0
   * @apiDescription Update the status of a specific application stage
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiParam {String} stageId Stage's unique ID
   * @apiBody {String} status New status for the stage
   *
   * @apiSuccess (200) {Object} stage Updated stage object
   * @apiSuccess (200) {String} message Success message
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  "stage": {
   *    "id": "stage1",
   *    "status": "completed"
   *  },
   *  "message": "Stage status updated successfully"
   * }
   *
   * @apiError (400) {String} BadRequest Invalid status or stage ID
   * @apiErrorExample {json} BadRequest:
   * {
   *  "message": "Invalid status or stage ID"
   * }
   *
   * @apiUse unauthorized
   *
   * @apiError (404) {String} NotFound Stage not found
   * @apiErrorExample {json} NotFound:
   * {
   *  "message": "Stage not found"
   * }
   */
  "/stages/:stageId",
  authenticate,
  updateStageStatus
);





router.put(
  /**
   * @api {put} /applications/:phase Update application phase
   * @apiName UpdateApplicationPhase
   * @apiGroup ApplicationsGroup
   * @apiVersion 1.0.0
   * @apiDescription Update data for a specific application phase
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiParam {String} phase Application phase identifier
   * @apiBody {Object} data Updated phase data
   *
   * @apiSuccess (200) {Object} application Updated application object
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  "userId": "123",
   *  "currentPhase": "semester",
   *  "applications": []
   * }
   *
   * @apiUse unauthorized
   *
   * @apiError (404) {String} NotFound Application or phase not found
   * @apiErrorExample {json} NotFound:
   * {
   *  "message": "Application or phase not found"
   * }
   */
  "/:phase",
  updateApplicationPhase
);


router.get(
  /**
   * @api {get} /applications/:phase/documents Get application documents
   * @apiName GetApplicationDocuments
   * @apiGroup ApplicationsGroup
   * @apiVersion 1.0.0
   * @apiDescription Retrieve all documents for a specific application phase
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiParam {String} phase Application phase identifier
   *
   * @apiSuccess (200) {Object[]} documents List of documents for the phase
   * @apiSuccess (200) {String} documents.id Document ID
   * @apiSuccess (200) {String} documents.documentType Document type
   * @apiSuccess (200) {String} documents.fileName File name
   * @apiSuccess (200) {String} documents.fileUrl File URL
   * @apiSuccess (200) {String} documents.sourceType Source type (upload/link)
   * @apiSuccess (200) {String} documents.addedAt Date added
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * [
   *  {
   *    "id": "doc123",
   *    "documentType": "passport",
   *    "fileName": "passport.pdf",
   *    "fileUrl": "https://...",
   *    "sourceType": "google_drive",
   *    "addedAt": "2025-11-29T10:00:00.000Z"
   *  }
   * ]
   *
   * @apiUse unauthorized
   *
   * @apiError (404) {String} NotFound Application or phase not found
   * @apiErrorExample {json} NotFound:
   * {
   *  "message": "Application or phase not found"
   * }
   */
  "/:phase/documents",
  getApplicationDocuments
);

router.get(
  /**
   * @api {get} /applications/:phase/required-documents Get required documents
   * @apiName GetRequiredDocuments
   * @apiGroup ApplicationsGroup
   * @apiVersion 1.0.0
   * @apiDescription Get the list of required documents for a specific application phase
   * @apiPermission none
   *
   * @apiParam {String} phase Application phase identifier
   *
   * @apiSuccess (200) {Object[]} documents List of required document types
   * @apiSuccess (200) {String} documents.type Document type identifier
   * @apiSuccess (200) {String} documents.name Display name of document
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * [
   *  {
   *    "type": "passport",
   *    "name": "Valid Passport"
   *  },
   *  {
   *    "type": "transcript",
   *    "name": "Academic Transcript"
   *  }
   * ]
   *
   * @apiError (404) {String} NotFound Phase not found
   * @apiErrorExample {json} NotFound:
   * {
   *  "message": "Phase not found"
   * }
   */
  "/:phase/required-documents",
  getRequiredDocuments
);


export default router;
