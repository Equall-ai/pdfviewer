export interface Point {
  x: number;
  y: number;
}

export interface ScaleInvarientPoint {
  x1: number;
  y1: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScaleInvarientRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MeasuredNode {
  box: ScaleInvarientRect;
  node: HTMLElement;
}

interface Sentence {
  text: string;
  boxes: ScaleInvarientRect[];
}

export interface Cell {
  sheet: string;
  x: number;
  y: number;
}

export interface Annotation extends ScaleInvarientRect {
  text: string[];
  sentence?: Sentence;
  page: number;
}

export interface AnnotationGroup {
  annotationsGroup: Annotation[];
  id: string;
}

export interface BoundingBox {
  page: number;
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
}

export interface Reference {
  highlight?: string[];
  text?: string;
  type: 'bounding_box' | 'cell';
  value: BoundingBox | Cell;
}

export interface BoundingBoxReference {
  text: string;
  value: BoundingBox;
  highlight: string[];
}

export interface CellReference {
  text: string;
  value: Cell;
  highlight: string[];
}

export interface Citation {
  doc_id: string;
  filename: string;
  references: Reference[];
}

export interface NodeCitation {
  id: string;
  docId: string;
  filename: string;
  type: string;
  references: Array<BoundingBoxReference | CellReference>;
}
