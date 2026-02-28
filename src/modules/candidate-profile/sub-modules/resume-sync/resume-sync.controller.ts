import { Request, Response } from 'express';
import { ResumeSyncService } from './resume-sync.service';
import { sendResponse } from '../../../../shared/utils/apiResponse';
const service = new ResumeSyncService();
export const dummyHandler = async (req: Request, res: Response) => {
  const data = await service.dummyLogic();
  sendResponse(res, 200, data);
};