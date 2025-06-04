import type { Annotation, Cell } from '$lib/types/annotations';
import type { IPDFJS } from './dependencies';
// eslint-disable-next-line
import * as pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs'; // DO NOT REMOVE - this is needed for the PDFHandler
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Match } from './PageInternals/drawing';
import { Loading } from '$lib/types/loading';

export class BaseHandler {
  private _zoom = 1;

  constructor() {
    this._zoom = 1;
  }

  public get zoom() {
    return this._zoom;
  }

  public set zoom(zoom: number) {
    this._zoom = zoom;
  }

  public setZoom(zoom: number) {
    if (zoom > 0.1 && zoom <= 1) {
      this._zoom = zoom;
    }
  }

  public zoomIn() {
    this._zoom += 0.1;
  }

  public zoomOut() {
    this._zoom -= 0.1;
  }
}
export class SpreadsheetHandler extends BaseHandler {
  public annotations: Cell[] = [];

  constructor() {
    super();
  }

  setCells(cells: Cell[]) {
    this.annotations = cells;
  }
}

export class PDFHandler extends BaseHandler {
  public pdfjs: IPDFJS;
  public worker: any;
  public current_doc: (PDFDocumentProxy & { search: (query: string) => void }) | null = null;
  public selected_match_idx: any;
  public loading_task: any;
  public annotations: Annotation[];
  public currentAnnotation: number | undefined;
  private fileUrl: string | null;
  private _search_matches: Match[] = [];
  public currentPage: number;
  public numPages: number;
  private _loadingState = Loading.NotStarted;
  constructor(pdfjs: any) {
    super();
    this.pdfjs = pdfjs;
    this.annotations = [];
    this.currentPage = 1;
    this.numPages = 1;
    this.fileUrl = null;
  }

  setAnnotations(annotations: Annotation[]) {
    this.annotations = annotations;
    this.currentAnnotation = annotations[0]?.page;
  }

  public get loadingState() {
    return this._loadingState;
  }

  public set loadingState(state: Loading) {
    this._loadingState = state;
  }

  public get search_matches() {
    return this._search_matches;
  }

  public set search_matches(matches: Match[]) {
    this._search_matches = matches;
  }

  private cleanup() {
    this.annotations = [];
    this.currentPage = 1;
    this.currentAnnotation = undefined;
    if (this.current_doc) {
      this.current_doc.destroy();
      this.current_doc = null;
    }
    if (this.loading_task) {
      this.loading_task.destroy();
      this.loading_task = null;
    }
    this.search_matches = [];
    this.selected_match_idx = null;
  }

  setFileUrl(fileUrl: string) {
    if (this.fileUrl === fileUrl) {
      return;
    }

    this.cleanup();
    this.fileUrl = fileUrl;
  }
}

export async function createPDFHandler(): Promise<PDFHandler> {
  const pdfjs = await import('pdfjs-dist');
  return new PDFHandler(pdfjs);
}
