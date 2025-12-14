import { Injectable, signal, computed } from '@angular/core';
import { ServiceRequest } from '../models/types';

@Injectable({
  providedIn: 'root',
})
export class RequestStateService {
  // Signal-based state
  private _requestsSignal = signal<ServiceRequest[]>([]);

  // Public readonly signals
  readonly requests = this._requestsSignal.asReadonly();

  // Computed signals for filtered data
  readonly pendingRequests = computed(() =>
    this._requestsSignal().filter((r) => r.status === 'pending'),
  );

  readonly acknowledgedRequests = computed(() =>
    this._requestsSignal().filter((r) => r.status === 'acknowledged'),
  );

  readonly completedRequests = computed(() =>
    this._requestsSignal().filter((r) => r.status === 'completed'),
  );

  // Methods to update state
  addRequest(request: ServiceRequest): void {
    this._requestsSignal.update((requests) => [...requests, request]);
  }

  updateRequest(updatedRequest: ServiceRequest): void {
    this._requestsSignal.update((requests) =>
      requests.map((r) => (r.id === updatedRequest.id ? updatedRequest : r)),
    );
  }

  removeRequest(requestId: string): void {
    this._requestsSignal.update((requests) => requests.filter((r) => r.id !== requestId));
  }

  clearRequests(): void {
    this._requestsSignal.set([]);
  }

  getRequestById(id: string): ServiceRequest | undefined {
    return this._requestsSignal().find((r) => r.id === id);
  }
}
