import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { UQ_UNITS_SYMBOL, Unit } from './entities/unit.entity';
import { UNIT_IN_USE, UNIT_SYMBOL_TAKEN, UnitsService } from './units.service';

const pgError = (code: string, constraint?: string) =>
  new QueryFailedError(
    'QUERY',
    [],
    Object.assign(new Error(code), { code, constraint }),
  );

describe('UnitsService', () => {
  let service: UnitsService;

  const repo = {
    create: jest.fn((fields: Partial<Unit>) => fields as Unit),
    save: jest.fn<Promise<Unit>, [Unit]>(),
    delete: jest.fn<Promise<{ affected?: number }>, [string]>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.delete.mockResolvedValue({ affected: 1 });

    const moduleRef = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: getRepositoryToken(Unit), useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(UnitsService);
  });

  it('maps a duplicate symbol to 409 with its own message', async () => {
    repo.save.mockRejectedValue(pgError('23505', UQ_UNITS_SYMBOL));

    await expect(
      service.create({ name: 'Piece', symbol: 'pcs' }),
    ).rejects.toThrow(new ConflictException(UNIT_SYMBOL_TAKEN));
  });

  it('refuses to delete a unit products still use', async () => {
    // Postgres reports ON DELETE RESTRICT as restrict_violation.
    repo.delete.mockRejectedValue(pgError('23001'));

    await expect(service.remove('u1')).rejects.toThrow(
      new ConflictException(UNIT_IN_USE),
    );
  });

  it('delete of an unknown unit is 404', async () => {
    repo.delete.mockResolvedValue({ affected: 0 });

    await expect(service.remove('u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
