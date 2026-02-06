import { Router } from "express";
import {getErasmusGrantTypes, applyForErasmusGrant, updateErasmusGrant, getUserErasmusGrants,
  applyForKelaSupport, updateKelaSupport, getKelaSupport,
  calculateTotalGrants, searchGrants, getAllGrantsSummary } from "../controllers/profileController";
import { authenticate } from "../../middlewares";

/**
 * @apiDefine GrantsGroup Grants
 * Grant application and management (Erasmus+, Kela, etc.)
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
   * @api {get} /grants/erasmus/types Get Erasmus+ grant types
   * @apiName GetErasmusGrantTypes
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Retrieve available Erasmus+ grant types
   * @apiPermission none
   *
   * @apiSuccess (200) {Object[]} types List of Erasmus+ grant types
   * @apiSuccess (200) {String} types.id Grant type ID
   * @apiSuccess (200) {String} types.name Grant type name
   * @apiSuccess (200) {String} types.description Description
   * @apiSuccess (200) {Number} types.amount Grant amount
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * [
   *  {
   *    "id": "studies",
   *    "name": "Studies Grant",
   *    "description": "Grant for study mobility",
   *    "amount": 600
   *  }
   * ]
   */
  "/erasmus/types",
  getErasmusGrantTypes
);

router.post(
  /**
   * @api {post} /grants/erasmus/apply Apply for Erasmus+ grant
   * @apiName ApplyForErasmusGrant
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Submit an application for Erasmus+ grant
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiBody {String} grantType Type of Erasmus+ grant
   * @apiBody {String} destination Destination country
   * @apiBody {String} duration Duration of stay
   * @apiBody {Object} [additionalInfo] Additional application information
   *
   * @apiSuccess (201) {Object} grant Created Erasmus+ grant application
   * @apiSuccess (201) {String} grant.id Grant application ID
   * @apiSuccess (201) {String} grant.status Application status
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 201 Created
   * {
   *  "id": "grant123",
   *  "grantType": "studies",
   *  "destination": "France",
   *  "status": "pending"
   * }
   *
   * @apiError (400) {String} BadRequest Missing required fields
   * @apiErrorExample {json} BadRequest:
   * {
   *  "message": "Missing required fields"
   * }
   *
   * @apiUse unauthorized
   */
  "/erasmus/apply",
  authenticate,
  applyForErasmusGrant
);

router.put(
  /**
   * @api {put} /grants/erasmus/:grantId Update Erasmus+ grant
   * @apiName UpdateErasmusGrant
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Update an existing Erasmus+ grant application
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiParam {String} grantId Erasmus+ grant unique ID
   * @apiBody {Object} updates Updated grant data
   *
   * @apiSuccess (200) {Object} grant Updated grant application
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  "id": "grant123",
   *  "status": "approved",
   *  "updatedAt": "2025-11-29T10:00:00.000Z"
   * }
   *
   * @apiUse unauthorized
   *
   * @apiError (404) {String} NotFound Grant not found
   * @apiErrorExample {json} NotFound:
   * {
   *  "message": "Grant not found"
   * }
   */
  "/erasmus/:grantId",
  authenticate,
  updateErasmusGrant
);

router.get(
  /**
   * @api {get} /grants/erasmus Get user Erasmus+ grants
   * @apiName GetUserErasmusGrants
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Retrieve all Erasmus+ grants for the authenticated user
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiSuccess (200) {Object[]} grants List of user's Erasmus+ grants
   * @apiSuccess (200) {String} grants.id Grant ID
   * @apiSuccess (200) {String} grants.grantType Grant type
   * @apiSuccess (200) {String} grants.status Application status
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * [
   *  {
   *    "id": "grant123",
   *    "grantType": "studies",
   *    "status": "approved"
   *  }
   * ]
   *
   * @apiUse unauthorized
   */
  "/erasmus",
  authenticate,
  getUserErasmusGrants
);

router.post(
  /**
   * @api {post} /grants/kela/apply Apply for Kela support
   * @apiName ApplyForKelaSupport
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Submit an application for Kela study support
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiBody {String} supportType Type of Kela support
   * @apiBody {Object} financialInfo Financial information
   * @apiBody {Object} [additionalInfo] Additional information
   *
   * @apiSuccess (201) {Object} support Created Kela support application
   * @apiSuccess (201) {String} support.id Application ID
   * @apiSuccess (201) {String} support.status Application status
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 201 Created
   * {
   *  "id": "kela123",
   *  "supportType": "study_grant",
   *  "status": "pending"
   * }
   *
   * @apiError (400) {String} BadRequest Missing required fields
   * @apiErrorExample {json} BadRequest:
   * {
   *  "message": "Missing required fields"
   * }
   *
   * @apiUse unauthorized
   */
  "/kela/apply",
  authenticate,
  applyForKelaSupport
);

router.put(
  /**
   * @api {put} /grants/kela/:kelaId Update Kela support
   * @apiName UpdateKelaSupport
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Update an existing Kela support application
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiParam {String} kelaId Kela support unique ID
   * @apiBody {Object} updates Updated support data
   *
   * @apiSuccess (200) {Object} support Updated Kela support application
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  "id": "kela123",
   *  "status": "approved",
   *  "updatedAt": "2025-11-29T10:00:00.000Z"
   * }
   *
   * @apiUse unauthorized
   *
   * @apiError (404) {String} NotFound Kela support not found
   * @apiErrorExample {json} NotFound:
   * {
   *  "message": "Kela support not found"
   * }
   */
  "/kela/:kelaId",
  authenticate,
  updateKelaSupport
);

router.get(
  /**
   * @api {get} /grants/kela Get Kela support
   * @apiName GetKelaSupport
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Retrieve Kela support applications for the authenticated user
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiSuccess (200) {Object[]} support List of Kela support applications
   * @apiSuccess (200) {String} support.id Support ID
   * @apiSuccess (200) {String} support.supportType Support type
   * @apiSuccess (200) {String} support.status Application status
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * [
   *  {
   *    "id": "kela123",
   *    "supportType": "study_grant",
   *    "status": "approved"
   *  }
   * ]
   *
   * @apiUse unauthorized
   */
  "/kela",
  authenticate,
  getKelaSupport
);

router.post(
  /**
   * @api {post} /grants/calculator Calculate total grants
   * @apiName CalculateTotalGrants
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Calculate total available grants based on user criteria
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiBody {Object} criteria Calculation criteria
   * @apiBody {String} criteria.destination Destination country
   * @apiBody {String} criteria.duration Study duration
   * @apiBody {Object} criteria.financialInfo Financial information
   *
   * @apiSuccess (200) {Object} calculation Grant calculation results
   * @apiSuccess (200) {Number} calculation.totalErasmus Total Erasmus+ grants
   * @apiSuccess (200) {Number} calculation.totalKela Total Kela support
   * @apiSuccess (200) {Number} calculation.grandTotal Grand total
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  "totalErasmus": 3600,
   *  "totalKela": 2500,
   *  "grandTotal": 6100
   * }
   *
   * @apiError (400) {String} BadRequest Missing required fields
   * @apiErrorExample {json} BadRequest:
   * {
   *  "message": "Missing required fields"
   * }
   *
   * @apiUse unauthorized
   */
  "/calculator",
  authenticate,
  calculateTotalGrants
);

router.get(
  /**
   * @api {get} /grants/search Search grants
   * @apiName SearchGrants
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Search for available grants based on criteria
   * @apiPermission none
   *
   * @apiQuery {String} [country] Filter by destination country
   * @apiQuery {String} [type] Filter by grant type
   * @apiQuery {Number} [minAmount] Minimum grant amount
   *
   * @apiSuccess (200) {Object[]} grants List of matching grants
   * @apiSuccess (200) {String} grants.id Grant ID
   * @apiSuccess (200) {String} grants.name Grant name
   * @apiSuccess (200) {Number} grants.amount Grant amount
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * [
   *  {
   *    "id": "grant1",
   *    "name": "Erasmus+ Studies",
   *    "amount": 600
   *  }
   * ]
   */
  "/search",
  searchGrants
);

router.get(
  /**
   * @api {get} /grants/summary Get all grants summary
   * @apiName GetAllGrantsSummary
   * @apiGroup GrantsGroup
   * @apiVersion 1.0.0
   * @apiDescription Get a summary of all grants for the authenticated user
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiSuccess (200) {Object} summary Grant summary
   * @apiSuccess (200) {Number} summary.totalErasmus Total Erasmus+ amount
   * @apiSuccess (200) {Number} summary.totalKela Total Kela amount
   * @apiSuccess (200) {Number} summary.grandTotal Grand total
   * @apiSuccess (200) {Number} summary.pendingApplications Number of pending applications
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  "totalErasmus": 3600,
   *  "totalKela": 2500,
   *  "grandTotal": 6100,
   *  "pendingApplications": 2
   * }
   *
   * @apiUse unauthorized
   */
  "/summary",
  authenticate,
  getAllGrantsSummary
);

export default router;
