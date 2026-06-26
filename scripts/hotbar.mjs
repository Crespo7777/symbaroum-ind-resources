const BREAD_BTN_ID = "tenebre-bread-btn";

export class HotbarService {
  static register() {
    this.refresh();
  }

  static refresh() {
    document.getElementById(BREAD_BTN_ID)?.remove();
  }
}
