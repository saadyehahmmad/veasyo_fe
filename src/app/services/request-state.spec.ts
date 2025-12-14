import { TestBed } from '@angular/core/testing';

import { RequestState } from './request-state';

describe('RequestState', () => {
  let service: RequestState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RequestState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
