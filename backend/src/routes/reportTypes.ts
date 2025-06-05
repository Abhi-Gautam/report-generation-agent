import { Router } from 'express';
import { 
  getEnabledReportTypes, 
  getReportTypeConfig, 
  getReportTypesForDropdown,
  VALID_REPORT_TYPE_IDS 
} from '../config/reportTypes';
import { LoggerService } from '../services/logger';

const router = Router();
const logger = new LoggerService();

// GET /api/report-types - Get all enabled report types for frontend dropdown
router.get('/', async (_req, res): Promise<void> => {
  try {
    const reportTypes = getReportTypesForDropdown();
    
    res.json({
      success: true,
      data: reportTypes,
      total: reportTypes.length
    });
  } catch (error) {
    logger.error('Failed to fetch report types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report types'
    });
  }
});

// GET /api/report-types/full - Get complete configuration for all enabled report types
router.get('/full', async (_req, res): Promise<void> => {
  try {
    const reportTypes = getEnabledReportTypes();
    
    res.json({
      success: true,
      data: reportTypes,
      total: reportTypes.length
    });
  } catch (error) {
    logger.error('Failed to fetch full report type configurations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report type configurations'
    });
  }
});

// GET /api/report-types/:id - Get specific report type configuration
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!VALID_REPORT_TYPE_IDS.includes(id)) {
      res.status(400).json({
        success: false,
        error: `Invalid report type ID: ${id}`,
        validIds: VALID_REPORT_TYPE_IDS
      });
      return;
    }
    
    const config = getReportTypeConfig(id);
    
    if (!config) {
      res.status(404).json({
        success: false,
        error: `Report type not found: ${id}`
      });
      return;
    }
    
    if (!config.enabled) {
      res.status(404).json({
        success: false,
        error: `Report type is disabled: ${id}`
      });
      return;
    }
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Failed to fetch report type configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report type configuration'
    });
  }
});

// GET /api/report-types/:id/template - Get only the template configuration for a specific report type
router.get('/:id/template', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!VALID_REPORT_TYPE_IDS.includes(id)) {
      res.status(400).json({
        success: false,
        error: `Invalid report type ID: ${id}`,
        validIds: VALID_REPORT_TYPE_IDS
      });
      return;
    }
    
    const config = getReportTypeConfig(id);
    
    if (!config || !config.enabled) {
      res.status(404).json({
        success: false,
        error: `Report type not found or disabled: ${id}`
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: config.id,
        template: config.template
      }
    });
  } catch (error) {
    logger.error('Failed to fetch report type template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report type template'
    });
  }
});

export default router;