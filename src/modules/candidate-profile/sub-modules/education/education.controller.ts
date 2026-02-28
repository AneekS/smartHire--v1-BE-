import { Request, Response } from 'express';
import { EducationService } from './education.service';
import { sendResponse } from '../../../../shared/utils/apiResponse';
const service = new EducationService();
export const dummyHandler = async (req: Request, res: Response) => {
  const data = await service.dummyLogic();
  sendResponse(res, 200, data);
};