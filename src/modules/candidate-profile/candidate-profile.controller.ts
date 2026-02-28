import { Request, Response } from 'express';
import { CandidateProfileService, toOwnerView } from './candidate-profile.service';
import { CandidateProfileRepository } from './candidate-profile.repository';
import { sendResponse } from '../../shared/utils/apiResponse';
import { NotFoundError } from '../../shared/errors/NotFoundError';

const service = new CandidateProfileService();
const repo = new CandidateProfileRepository();

export const createProfile = async (req: Request, res: Response) => {
  const data = await service.createProfile(req.user!.userId, req.body, req.id!);
  sendResponse(res, 201, data);
};

export const getMyProfile = async (req: Request, res: Response) => {
  const profile = await repo.findByUserId(req.user!.userId);
  if (!profile) throw new NotFoundError('Profile not found');
  sendResponse(res, 200, await toOwnerView(profile));
};

export const getProfileById = async (req: Request, res: Response) => {
  const data = await service.getProfileById(req.params.profileId, req.user!.userId, req.user!.role);
  sendResponse(res, 200, data);
};

export const updateProfile = async (req: Request, res: Response) => {
  const profile = await repo.findByUserId(req.user!.userId);
  if (!profile) throw new NotFoundError('Profile not found');
  const updated = await service.updateProfile(profile.id, req.user!.userId, req.body, req.id!);
  sendResponse(res, 200, updated);
};

export const softDeleteProfile = async (req: Request, res: Response) => {
  const profile = await repo.findByUserId(req.user!.userId);
  if (!profile) throw new NotFoundError('Profile not found');
  await service.softDeleteProfile(profile.id, req.user!.userId, req.id!);
  sendResponse(res, 204, null);
};