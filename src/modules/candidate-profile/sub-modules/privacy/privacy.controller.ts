import { Request, Response } from 'express';
import { PrivacyService } from './privacy.service';
import { sendResponse } from '../../../../shared/utils/apiResponse';
const service = new PrivacyService();
export const dummyHandler = async (req: Request, res: Response) => {
  const data = await service.dummyLogic();
  sendResponse(res, 200, data);
};