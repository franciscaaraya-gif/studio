'use client';
    
import { useState, useEffect, useRef } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the options of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocOptions<T> {
  initialData?: WithId<T>;
  onNewData?: (data: WithId<T> | null) => void;
}

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence. Also make sure that its dependencies are stable
 * references
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @param {UseDocOptions<T>} [options] - Optional settings for initial data and callbacks.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: (DocumentReference<DocumentData> & {__memo?: boolean}) | null | undefined,
  options?: UseDocOptions<T>
): UseDocResult<T> {
  if (memoizedDocRef && !memoizedDocRef.__memo) {
    throw new Error(`The document reference for '${memoizedDocRef.path}' must be wrapped in useMemoFirebase to prevent performance issues.`);
  }

  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(options?.initialData || null);
  const [isLoading, setIsLoading] = useState<boolean>(!options?.initialData);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const onNewDataRef = useRef(options?.onNewData);
  useEffect(() => {
    onNewDataRef.current = options?.onNewData;
  }, [options?.onNewData]);


  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        let result: StateDataType = null;
        if (snapshot.exists()) {
          result = { ...(snapshot.data() as T), id: snapshot.id };
        }
        
        if (onNewDataRef.current) {
          onNewDataRef.current(result);
        } else {
          setData(result);
        }

        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        })

        setError(contextualError);
        if (!onNewDataRef.current) {
            setData(null);
        }
        setIsLoading(false);

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef]);

  return { data, isLoading, error };
}
