"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const obsidian_2 = require("obsidian");
const DEFAULT_DATA = { cards: {}, };
// --- MODAL WYBORU TALII (TERAZ UŻYWANY W DWÓCH MIEJSCACH) ---
class DeckSelectionModal extends obsidian_1.FuzzySuggestModal {
    constructor(app, plugin, onChoose) {
        super(app);
        this.plugin = plugin;
        this.allDecks = this.plugin.getAllDecks();
        this.onChoose = onChoose;
    }
    getItems() { return ["* Wszystkie talie *", ...this.allDecks]; }
    getItemText(item) { return item; }
    onChooseItem(selectedDeck, evt) {
        this.onChoose(selectedDeck);
    }
}
// --- NOWA KLASA: MODAL PRZEGLĄDARKI ---
class BrowserModal extends obsidian_1.Modal {
    constructor(app, plugin, cards) {
        super(app);
        this.currentCardIndex = 0;
        this.plugin = plugin;
        // Sortujemy karty alfabetycznie po ścieżce pliku dla przewidywalnej kolejności
        this.cards = cards.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
    }
    onOpen() { this.displayCard(); }
    onClose() { this.contentEl.empty(); }
    displayCard() {
        this.contentEl.empty();
        const card = this.cards[this.currentCardIndex];
        if (!card) {
            this.close();
            return;
        }
        // Kontener główny
        const container = this.contentEl.createDiv({ cls: 'flowcards-browser-container' });
        // Nagłówek z nawigacją
        const navHeader = container.createDiv({ cls: 'flowcards-browser-nav' });
        const prevBtn = navHeader.createEl('button', { text: '<< Poprzednia' });
        navHeader.createSpan({ text: `Karta ${this.currentCardIndex + 1} z ${this.cards.length}` });
        const nextBtn = navHeader.createEl('button', { text: 'Następna >>' });
        prevBtn.disabled = this.currentCardIndex === 0;
        nextBtn.disabled = this.currentCardIndex === this.cards.length - 1;
        prevBtn.onclick = () => { this.currentCardIndex--; this.displayCard(); };
        nextBtn.onclick = () => { this.currentCardIndex++; this.displayCard(); };
        // Link do źródła
        const sourceLink = container.createDiv({ cls: 'flowcards-source-link' });
        sourceLink.setText(`Źródło: ${card.sourcePath}`);
        sourceLink.onclick = () => this.plugin.navigateToSource(card);
        // Pytanie
        container.createEl('h3', { text: 'Pytanie' });
        const questionEl = container.createDiv({ cls: 'flowcards-browser-content' });
        obsidian_1.MarkdownRenderer.render(this.app, card.question, questionEl, card.sourcePath, this.plugin);
        // Odpowiedź
        container.createEl('h3', { text: 'Odpowiedź' });
        const answerEl = container.createDiv({ cls: 'flowcards-browser-content' });
        obsidian_1.MarkdownRenderer.render(this.app, card.answer, answerEl, card.sourcePath, this.plugin);
    }
}
// --- MODAL NAUKI (bez zmian) ---
class LearningModal extends obsidian_1.Modal {
}
// --- GŁÓWNA KLASA PLUGINU ---
class FlowCardsPlugin extends obsidian_1.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Ładowanie pluginu FlowCards...');
            yield this.loadPluginData();
            this.addCommand({
                id: 'update-flashcards-index',
                name: 'Aktualizuj indeks fiszek',
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    yield this.loadPluginData();
                    yield this.parseVaultForFlashcards();
                }),
            });
            this.addCommand({
                id: 'review-flashcards',
                name: 'Ucz się',
                callback: () => {
                    new DeckSelectionModal(this.app, this, (selectedDeck) => {
                        const allDecks = this.getAllDecks();
                        const decksToReview = selectedDeck === "* Wszystkie talie *" ? allDecks : [selectedDeck];
                        this.startLearningSession(decksToReview);
                    }).open();
                },
            });
            // NOWE POLECENIE
            this.addCommand({
                id: 'browse-flashcards',
                name: 'Przeglądaj talie',
                callback: () => {
                    new DeckSelectionModal(this.app, this, (selectedDeck) => {
                        const allCards = Object.values(this.data.cards);
                        const allDecks = this.getAllDecks();
                        const decksToBrowse = selectedDeck === "* Wszystkie talie *" ? allDecks : [selectedDeck];
                        const cardsInDeck = allCards.filter(card => card.decks.some(d => decksToBrowse.includes(d)));
                        if (cardsInDeck.length > 0) {
                            new BrowserModal(this.app, this, cardsInDeck).open();
                        }
                        else {
                            new obsidian_1.Notice('Brak fiszek w wybranej talii!');
                        }
                    }).open();
                },
            });
        });
    }
    // NOWA FUNKCJA NAWIGACYJNA
    navigateToSource(card) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.app.vault.getAbstractFileByPath(card.sourcePath);
            if (file instanceof obsidian_1.TFile) {
                const leaf = this.app.workspace.getLeaf(false);
                yield leaf.openFile(file, {
                    state: {
                        eState: { line: card.sourceLine }
                    }
                });
                // Opcjonalnie: podświetlenie linii
                // Niestety, proste podświetlenie jest trudne w API v1. 
                // Skupienie na linii jest najważniejsze.
            }
            else {
                new obsidian_1.Notice(`Nie znaleziono pliku: ${card.sourcePath}`);
            }
        });
    }
}
exports.default = FlowCardsPlugin;
// ================================================================================================================
// --- UZUPEŁNIENIE PUSTYCH I NIEZMIENIONYCH FRAGMENTÓW (skopiuj ten blok w całości na koniec pliku) ---
// ================================================================================================================
LearningModal.prototype.constructor = function (app, plugin, reviewQueue) {
    obsidian_1.Modal.call(this, app);
    this.plugin = plugin;
    this.reviewQueue = this.shuffleArray(reviewQueue);
    this.cardsToRepeat = [];
    this.currentCardIndex = 0;
};
LearningModal.prototype.shuffleArray = function (array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};
LearningModal.prototype.onOpen = function () { this.displayCard(); };
LearningModal.prototype.onClose = function () { this.contentEl.empty(); };
LearningModal.prototype.displayCard = function () {
    this.contentEl.empty();
    const card = this.reviewQueue[this.currentCardIndex];
    if (!card) {
        if (this.cardsToRepeat.length > 0) {
            this.reviewQueue = this.shuffleArray(this.cardsToRepeat);
            this.cardsToRepeat = [];
            this.currentCardIndex = 0;
            this.displayCard();
        }
        else {
            new obsidian_1.Notice('Sesja nauki zakończona!');
            this.close();
        }
        return;
    }
    const container = this.contentEl.createDiv({ cls: 'flowcards-container' });
    const questionEl = container.createDiv({ cls: 'flowcards-question' });
    obsidian_1.MarkdownRenderer.render(this.app, card.question, questionEl, card.sourcePath, this.plugin);
    const answerContainer = container.createDiv({ cls: 'flowcards-answer', attr: { 'style': 'display: none;' } });
    const preAnswerButtons = container.createDiv({ cls: 'flowcards-buttons-container' });
    const showAnswerBtn = preAnswerButtons.createEl('button', { text: 'Pokaż odpowiedź' });
    const skipBtn = preAnswerButtons.createEl('button', { text: 'Pomiń', cls: 'mod-warning' });
    skipBtn.onclick = () => { this.currentCardIndex++; this.displayCard(); };
    const postAnswerButtons = container.createDiv({ cls: 'flowcards-buttons-container', attr: { 'style': 'display: none;' } });
    showAnswerBtn.onclick = () => {
        obsidian_1.MarkdownRenderer.render(this.app, card.answer, answerContainer, card.sourcePath, this.plugin);
        answerContainer.style.display = 'block';
        preAnswerButtons.style.display = 'none';
        postAnswerButtons.style.display = 'flex';
    };
    const handleAnswer = (rating) => __awaiter(this, void 0, void 0, function* () {
        if (rating === 'again') {
            this.cardsToRepeat.push(card);
        }
        this.plugin.processReview(card.id, rating);
        this.currentCardIndex++;
        this.displayCard();
    });
    const againBtn = postAnswerButtons.createEl('button', { text: 'Again' });
    againBtn.onclick = () => handleAnswer('again');
    const hardBtn = postAnswerButtons.createEl('button', { text: 'Hard' });
    hardBtn.onclick = () => handleAnswer('hard');
    const okBtn = postAnswerButtons.createEl('button', { text: 'Ok' });
    okBtn.onclick = () => handleAnswer('ok');
    const easyBtn = postAnswerButtons.createEl('button', { text: 'Easy' });
    easyBtn.onclick = () => handleAnswer('easy');
};
FlowCardsPlugin.prototype.loadPluginData = function () {
    return __awaiter(this, void 0, void 0, function* () { this.data = Object.assign({}, DEFAULT_DATA, yield this.loadData()); });
};
FlowCardsPlugin.prototype.savePluginData = function () {
    return __awaiter(this, void 0, void 0, function* () { yield this.saveData(this.data); });
};
FlowCardsPlugin.prototype.getAllDecks = function () {
    const allCards = Object.values(this.data.cards);
    const deckSet = new Set();
    for (const card of allCards) {
        for (const deck of card.decks) {
            deckSet.add(deck);
        }
    }
    return Array.from(deckSet).sort();
};
FlowCardsPlugin.prototype.startLearningSession = function (decks) {
    const reviewQueue = this.getCardsForReview(decks);
    if (reviewQueue.length > 0) {
        new LearningModal(this.app, this, reviewQueue).open();
    }
    else {
        new obsidian_1.Notice('Brak fiszek do powtórki w wybranych taliach!');
    }
};
FlowCardsPlugin.prototype.getCardsForReview = function (decks) {
    const now = (0, obsidian_2.moment)();
    const allCards = Object.values(this.data.cards);
    return allCards.filter(card => {
        const inSelectedDeck = card.decks.some(d => decks.includes(d));
        if (!inSelectedDeck)
            return false;
        if (card.status === 'new')
            return true;
        if (card.dueDate && (0, obsidian_2.moment)(card.dueDate).isSameOrBefore(now)) {
            return true;
        }
        return false;
    });
};
FlowCardsPlugin.prototype.processReview = function (cardId, rating) {
    const card = this.data.cards[cardId];
    if (!card)
        return;
    let newInterval;
    const oldStatus = card.status;
    if (rating === 'again') {
        card.interval = 0;
        card.status = 'learning';
        newInterval = 1 / (24 * 60);
    }
    else {
        if (oldStatus === 'new' || oldStatus === 'learning') {
            newInterval = rating === 'hard' ? 1 : rating === 'ok' ? 3 : 5;
        }
        else {
            newInterval = rating === 'hard' ? card.interval * 1.2 : rating === 'ok' ? card.interval * card.easeFactor : card.interval * card.easeFactor * 1.3;
            if (rating === 'hard')
                card.easeFactor = Math.max(1.3, card.easeFactor - 0.15);
            else if (rating === 'easy')
                card.easeFactor += 0.15;
        }
        card.interval = newInterval;
        card.status = 'review';
    }
    const dueDate = (0, obsidian_2.moment)().add(newInterval, 'days');
    card.dueDate = dueDate.format();
    this.savePluginData();
};
FlowCardsPlugin.prototype.parseVaultForFlashcards = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const files = this.app.vault.getMarkdownFiles();
        const cardsInVault = {};
        for (const file of files) {
            const fileContent = yield this.app.vault.cachedRead(file);
            let fileContentLines = fileContent.split('\n');
            let fileModified = false;
            const rawCards = this.findRawCards(fileContentLines);
            for (let i = rawCards.length - 1; i >= 0; i--) {
                const rawCard = rawCards[i];
                let cardId = rawCard.id;
                if (!cardId) {
                    cardId = `fc-${Date.now()}${i}`;
                    const lineToModify = fileContentLines[rawCard.separatorLine];
                    fileContentLines[rawCard.separatorLine] = `${lineToModify.trimEnd()} ^${cardId}`;
                    fileModified = true;
                }
                if (this.data.cards[cardId]) {
                    this.data.cards[cardId].question = rawCard.question;
                    this.data.cards[cardId].answer = rawCard.answer;
                    this.data.cards[cardId].decks = rawCard.decks;
                    this.data.cards[cardId].sourcePath = file.path;
                }
                else {
                    this.data.cards[cardId] = {
                        id: cardId, question: rawCard.question, answer: rawCard.answer, decks: rawCard.decks,
                        sourcePath: file.path, sourceLine: rawCard.separatorLine, status: 'new',
                        dueDate: null, interval: 0, easeFactor: 2.5
                    };
                }
                cardsInVault[cardId] = this.data.cards[cardId];
            }
            if (fileModified) {
                yield this.app.vault.modify(file, fileContentLines.join('\n'));
            }
        }
        for (const id in this.data.cards) {
            if (!cardsInVault[id]) {
                delete this.data.cards[id];
            }
        }
        new obsidian_1.Notice(`Indeks zaktualizowany. Śledzonych fiszek: ${Object.keys(this.data.cards).length}`);
        yield this.savePluginData();
    });
};
FlowCardsPlugin.prototype.findRawCards = function (lines) {
    const foundCards = [];
    const separatorRegex = /^\?\s*((?:#deck\/\S+\s*)+)(?:\s*\^(\S+))?/;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trimEnd();
        const match = line.match(separatorRegex);
        if (match) {
            const questionLines = [];
            for (let j = i - 1; j >= 0; j--) {
                if (lines[j].trim() === '')
                    break;
                questionLines.unshift(lines[j]);
            }
            const answerLines = [];
            for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].trim() === '')
                    break;
                answerLines.push(lines[j]);
            }
            if (questionLines.length > 0 && answerLines.length > 0) {
                const tagString = match[1];
                const cardId = match[2] || null;
                const decks = tagString.trim().split(/\s+/).map(tag => tag.substring(1));
                foundCards.push({
                    question: questionLines.join('\n'), answer: answerLines.join('\n'),
                    decks: decks, id: cardId, separatorLine: i
                });
            }
        }
    }
    return foundCards;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBa0c7QUFDbEcsdUNBQWtDO0FBU2xDLE1BQU0sWUFBWSxHQUFrQixFQUFFLEtBQUssRUFBRSxFQUFFLEdBQUcsQ0FBQztBQUVuRCwrREFBK0Q7QUFDL0QsTUFBTSxrQkFBbUIsU0FBUSw0QkFBeUI7SUFLdEQsWUFBWSxHQUFRLEVBQUUsTUFBdUIsRUFBRSxRQUF3QztRQUNuRixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDWCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDN0IsQ0FBQztJQUNELFFBQVEsS0FBZSxPQUFPLENBQUMscUJBQXFCLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFFLFdBQVcsQ0FBQyxJQUFZLElBQVksT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2xELFlBQVksQ0FBQyxZQUFvQixFQUFFLEdBQStCO1FBQzlELElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDaEMsQ0FBQztDQUNKO0FBRUQseUNBQXlDO0FBQ3pDLE1BQU0sWUFBYSxTQUFRLGdCQUFLO0lBSzVCLFlBQVksR0FBUSxFQUFFLE1BQXVCLEVBQUUsS0FBa0I7UUFDN0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBSFAscUJBQWdCLEdBQVcsQ0FBQyxDQUFDO1FBSWpDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLCtFQUErRTtRQUMvRSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FB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QUN2QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFO29CQUFFLE1BQU07Z0JBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFDLENBQUM7WUFDN0csSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNyRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQUMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQztnQkFDNUQsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pFLFVBQVUsQ0FBQyxJQUFJLENBQUM7b0JBQ1osUUFBUSxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO29CQUNsRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLENBQUM7aUJBQzdDLENBQUMsQ0FBQztZQUNQLENBQUM7UUFDTCxDQUFDO0lBQ0wsQ0FBQztJQUNELE9BQU8sVUFBVSxDQUFDO0FBQ3RCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgUGx1Z2luLCBOb3RpY2UsIFRGaWxlLCBNb2RhbCwgTWFya2Rvd25SZW5kZXJlciwgRnV6enlTdWdnZXN0TW9kYWwgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5cbi8vIC0tLSBJTlRFUkZFSlNZIEkgVFlQWSAtLS1cbnR5cGUgQ2FyZFN0YXR1cyA9ICduZXcnIHwgJ2xlYXJuaW5nJyB8ICdyZXZpZXcnO1xuaW50ZXJmYWNlIENhcmRTdGF0ZSB7XG4gICAgaWQ6IHN0cmluZzsgcXVlc3Rpb246IHN0cmluZzsgYW5zd2VyOiBzdHJpbmc7IGRlY2tzOiBzdHJpbmdbXTsgc291cmNlUGF0aDogc3RyaW5nOyBzb3VyY2VMaW5lOiBudW1iZXI7XG4gICAgc3RhdHVzOiBDYXJkU3RhdHVzOyBkdWVEYXRlOiBzdHJpbmcgfCBudWxsOyBpbnRlcnZhbDogbnVtYmVyOyBlYXNlRmFjdG9yOiBudW1iZXI7XG59XG5pbnRlcmZhY2UgRmxvd0NhcmRzRGF0YSB7IGNhcmRzOiBSZWNvcmQ8c3RyaW5nLCBDYXJkU3RhdGU+OyB9XG5jb25zdCBERUZBVUxUX0RBVEE6IEZsb3dDYXJkc0RhdGEgPSB7IGNhcmRzOiB7fSwgfTtcblxuLy8gLS0tIE1PREFMIFdZQk9SVSBUQUxJSSAoVEVSQVogVcW7WVdBTlkgVyBEV8OTQ0ggTUlFSlNDQUNIKSAtLS1cbmNsYXNzIERlY2tTZWxlY3Rpb25Nb2RhbCBleHRlbmRzIEZ1enp5U3VnZ2VzdE1vZGFsPHN0cmluZz4ge1xuICAgIHByaXZhdGUgcGx1Z2luOiBGbG93Q2FyZHNQbHVnaW47XG4gICAgcHJpdmF0ZSBhbGxEZWNrczogc3RyaW5nW107XG4gICAgcHJpdmF0ZSBvbkNob29zZTogKHNlbGVjdGVkRGVjazogc3RyaW5nKSA9PiB2b2lkO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogRmxvd0NhcmRzUGx1Z2luLCBvbkNob29zZTogKHNlbGVjdGVkRGVjazogc3RyaW5nKSA9PiB2b2lkKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgICAgICB0aGlzLmFsbERlY2tzID0gdGhpcy5wbHVnaW4uZ2V0QWxsRGVja3MoKTtcbiAgICAgICAgdGhpcy5vbkNob29zZSA9IG9uQ2hvb3NlO1xuICAgIH1cbiAgICBnZXRJdGVtcygpOiBzdHJpbmdbXSB7IHJldHVybiBbXCIqIFdzenlzdGtpZSB0YWxpZSAqXCIsIC4uLnRoaXMuYWxsRGVja3NdOyB9XG4gICAgZ2V0SXRlbVRleHQoaXRlbTogc3RyaW5nKTogc3RyaW5nIHsgcmV0dXJuIGl0ZW07IH1cbiAgICBvbkNob29zZUl0ZW0oc2VsZWN0ZWREZWNrOiBzdHJpbmcsIGV2dDogTW91c2VFdmVudCB8IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5vbkNob29zZShzZWxlY3RlZERlY2spO1xuICAgIH1cbn1cblxuLy8gLS0tIE5PV0EgS0xBU0E6IE1PREFMIFBSWkVHTMSEREFSS0kgLS0tXG5jbGFzcyBCcm93c2VyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcHJpdmF0ZSBwbHVnaW46IEZsb3dDYXJkc1BsdWdpbjtcbiAgICBwcml2YXRlIGNhcmRzOiBDYXJkU3RhdGVbXTtcbiAgICBwcml2YXRlIGN1cnJlbnRDYXJkSW5kZXg6IG51bWJlciA9IDA7XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBGbG93Q2FyZHNQbHVnaW4sIGNhcmRzOiBDYXJkU3RhdGVbXSkge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICAgICAgLy8gU29ydHVqZW15IGthcnR5IGFsZmFiZXR5Y3puaWUgcG8gxZtjaWXFvGNlIHBsaWt1IGRsYSBwcnpld2lkeXdhbG5laiBrb2xlam5vxZtjaVxuICAgICAgICB0aGlzLmNhcmRzID0gY2FyZHMuc29ydCgoYSwgYikgPT4gYS5zb3VyY2VQYXRoLmxvY2FsZUNvbXBhcmUoYi5zb3VyY2VQYXRoKSk7XG4gICAgfVxuXG4gICAgb25PcGVuKCkgeyB0aGlzLmRpc3BsYXlDYXJkKCk7IH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG5cbiAgICBkaXNwbGF5Q2FyZCgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICAgICAgY29uc3QgY2FyZCA9IHRoaXMuY2FyZHNbdGhpcy5jdXJyZW50Q2FyZEluZGV4XTtcbiAgICAgICAgaWYgKCFjYXJkKSB7IHRoaXMuY2xvc2UoKTsgcmV0dXJuOyB9XG5cbiAgICAgICAgLy8gS29udGVuZXIgZ8WCw7N3bnlcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiAnZmxvd2NhcmRzLWJyb3dzZXItY29udGFpbmVyJyB9KTtcblxuICAgICAgICAvLyBOYWfFgsOzd2VrIHogbmF3aWdhY2rEhVxuICAgICAgICBjb25zdCBuYXZIZWFkZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZmxvd2NhcmRzLWJyb3dzZXItbmF2JyB9KTtcbiAgICAgICAgY29uc3QgcHJldkJ0biA9IG5hdkhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnPDwgUG9wcnplZG5pYScgfSk7XG4gICAgICAgIG5hdkhlYWRlci5jcmVhdGVTcGFuKHsgdGV4dDogYEthcnRhICR7dGhpcy5jdXJyZW50Q2FyZEluZGV4ICsgMX0geiAke3RoaXMuY2FyZHMubGVuZ3RofWAgfSk7XG4gICAgICAgIGNvbnN0IG5leHRCdG4gPSBuYXZIZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ05hc3TEmXBuYSA+PicgfSk7XG4gICAgICAgIFxuICAgICAgICBwcmV2QnRuLmRpc2FibGVkID0gdGhpcy5jdXJyZW50Q2FyZEluZGV4ID09PSAwO1xuICAgICAgICBuZXh0QnRuLmRpc2FibGVkID0gdGhpcy5jdXJyZW50Q2FyZEluZGV4ID09PSB0aGlzLmNhcmRzLmxlbmd0aCAtIDE7XG5cbiAgICAgICAgcHJldkJ0bi5vbmNsaWNrID0gKCkgPT4geyB0aGlzLmN1cnJlbnRDYXJkSW5kZXgtLTsgdGhpcy5kaXNwbGF5Q2FyZCgpOyB9O1xuICAgICAgICBuZXh0QnRuLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMuY3VycmVudENhcmRJbmRleCsrOyB0aGlzLmRpc3BsYXlDYXJkKCk7IH07XG4gICAgICAgIFxuICAgICAgICAvLyBMaW5rIGRvIMW6csOzZMWCYVxuICAgICAgICBjb25zdCBzb3VyY2VMaW5rID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogJ2Zsb3djYXJkcy1zb3VyY2UtbGluaycgfSk7XG4gICAgICAgIHNvdXJjZUxpbmsuc2V0VGV4dChgxblyw7NkxYJvOiAke2NhcmQuc291cmNlUGF0aH1gKTtcbiAgICAgICAgc291cmNlTGluay5vbmNsaWNrID0gKCkgPT4gdGhpcy5wbHVnaW4ubmF2aWdhdGVUb1NvdXJjZShjYXJkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFB5dGFuaWVcbiAgICAgICAgY29udGFpbmVyLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1B5dGFuaWUnIH0pO1xuICAgICAgICBjb25zdCBxdWVzdGlvbkVsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogJ2Zsb3djYXJkcy1icm93c2VyLWNvbnRlbnQnIH0pO1xuICAgICAgICBNYXJrZG93blJlbmRlcmVyLnJlbmRlcih0aGlzLmFwcCwgY2FyZC5xdWVzdGlvbiwgcXVlc3Rpb25FbCwgY2FyZC5zb3VyY2VQYXRoLCB0aGlzLnBsdWdpbik7XG4gICAgICAgIFxuICAgICAgICAvLyBPZHBvd2llZMW6XG4gICAgICAgIGNvbnRhaW5lci5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdPZHBvd2llZMW6JyB9KTtcbiAgICAgICAgY29uc3QgYW5zd2VyRWwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZmxvd2NhcmRzLWJyb3dzZXItY29udGVudCcgfSk7XG4gICAgICAgIE1hcmtkb3duUmVuZGVyZXIucmVuZGVyKHRoaXMuYXBwLCBjYXJkLmFuc3dlciwgYW5zd2VyRWwsIGNhcmQuc291cmNlUGF0aCwgdGhpcy5wbHVnaW4pO1xuICAgIH1cbn1cblxuXG4vLyAtLS0gTU9EQUwgTkFVS0kgKGJleiB6bWlhbikgLS0tXG5jbGFzcyBMZWFybmluZ01vZGFsIGV4dGVuZHMgTW9kYWwgeyAvKiAuLi4ga29kIHRlaiBrbGFzeSBwb3pvc3RhamUgYmV6IHptaWFuIC4uLiAqLyB9XG5cblxuLy8gLS0tIEfFgcOTV05BIEtMQVNBIFBMVUdJTlUgLS0tXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGbG93Q2FyZHNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAgIGRhdGE6IEZsb3dDYXJkc0RhdGE7XG5cbiAgICBhc3luYyBvbmxvYWQoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfFgWFkb3dhbmllIHBsdWdpbnUgRmxvd0NhcmRzLi4uJyk7XG4gICAgICAgIGF3YWl0IHRoaXMubG9hZFBsdWdpbkRhdGEoKTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICd1cGRhdGUtZmxhc2hjYXJkcy1pbmRleCcsXG4gICAgICAgICAgICBuYW1lOiAnQWt0dWFsaXp1aiBpbmRla3MgZmlzemVrJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2FkUGx1Z2luRGF0YSgpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGFyc2VWYXVsdEZvckZsYXNoY2FyZHMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAncmV2aWV3LWZsYXNoY2FyZHMnLFxuICAgICAgICAgICAgbmFtZTogJ1VjeiBzacSZJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbmV3IERlY2tTZWxlY3Rpb25Nb2RhbCh0aGlzLmFwcCwgdGhpcywgKHNlbGVjdGVkRGVjaykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbGxEZWNrcyA9IHRoaXMuZ2V0QWxsRGVja3MoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVja3NUb1JldmlldyA9IHNlbGVjdGVkRGVjayA9PT0gXCIqIFdzenlzdGtpZSB0YWxpZSAqXCIgPyBhbGxEZWNrcyA6IFtzZWxlY3RlZERlY2tdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0TGVhcm5pbmdTZXNzaW9uKGRlY2tzVG9SZXZpZXcpO1xuICAgICAgICAgICAgICAgIH0pLm9wZW4oKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE5PV0UgUE9MRUNFTklFXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2Jyb3dzZS1mbGFzaGNhcmRzJyxcbiAgICAgICAgICAgIG5hbWU6ICdQcnplZ2zEhWRhaiB0YWxpZScsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldyBEZWNrU2VsZWN0aW9uTW9kYWwodGhpcy5hcHAsIHRoaXMsIChzZWxlY3RlZERlY2spID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWxsQ2FyZHMgPSBPYmplY3QudmFsdWVzKHRoaXMuZGF0YS5jYXJkcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFsbERlY2tzID0gdGhpcy5nZXRBbGxEZWNrcygpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWNrc1RvQnJvd3NlID0gc2VsZWN0ZWREZWNrID09PSBcIiogV3N6eXN0a2llIHRhbGllICpcIiA/IGFsbERlY2tzIDogW3NlbGVjdGVkRGVja107XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXJkc0luRGVjayA9IGFsbENhcmRzLmZpbHRlcihjYXJkID0+IFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FyZC5kZWNrcy5zb21lKGQgPT4gZGVja3NUb0Jyb3dzZS5pbmNsdWRlcyhkKSlcbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoY2FyZHNJbkRlY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IEJyb3dzZXJNb2RhbCh0aGlzLmFwcCwgdGhpcywgY2FyZHNJbkRlY2spLm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0JyYWsgZmlzemVrIHcgd3licmFuZWogdGFsaWkhJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5vcGVuKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBOT1dBIEZVTktDSkEgTkFXSUdBQ1lKTkFcbiAgICBhc3luYyBuYXZpZ2F0ZVRvU291cmNlKGNhcmQ6IENhcmRTdGF0ZSkge1xuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGNhcmQuc291cmNlUGF0aCk7XG4gICAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZihmYWxzZSk7XG4gICAgICAgICAgICBhd2FpdCBsZWFmLm9wZW5GaWxlKGZpbGUsIHtcbiAgICAgICAgICAgICAgICBzdGF0ZToge1xuICAgICAgICAgICAgICAgICAgICBlU3RhdGU6IHsgbGluZTogY2FyZC5zb3VyY2VMaW5lIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIE9wY2pvbmFsbmllOiBwb2TFm3dpZXRsZW5pZSBsaW5paVxuICAgICAgICAgICAgLy8gTmllc3RldHksIHByb3N0ZSBwb2TFm3dpZXRsZW5pZSBqZXN0IHRydWRuZSB3IEFQSSB2MS4gXG4gICAgICAgICAgICAvLyBTa3VwaWVuaWUgbmEgbGluaWkgamVzdCBuYWp3YcW8bmllanN6ZS5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYE5pZSB6bmFsZXppb25vIHBsaWt1OiAke2NhcmQuc291cmNlUGF0aH1gKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyAtLS0gUG96b3N0YcWCZSBmdW5rY2plIChiZXogd2nEmWtzenljaCB6bWlhbikgLS0tXG4gICAgLy8gLi4uIGNhxYJhIHJlc3p0YSBrb2R1IHogcG9wcnplZG5pZWogd2Vyc2ppIC4uLlxufVxuXG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIC0tLSBVWlVQRcWBTklFTklFIFBVU1RZQ0ggSSBOSUVaTUlFTklPTllDSCBGUkFHTUVOVMOTVyAoc2tvcGl1aiB0ZW4gYmxvayB3IGNhxYJvxZtjaSBuYSBrb25pZWMgcGxpa3UpIC0tLVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuTGVhcm5pbmdNb2RhbC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBmdW5jdGlvbiAoYXBwOiBBcHAsIHBsdWdpbjogRmxvd0NhcmRzUGx1Z2luLCByZXZpZXdRdWV1ZTogQ2FyZFN0YXRlW10pIHtcbiAgICBNb2RhbC5jYWxsKHRoaXMsIGFwcCk7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgdGhpcy5yZXZpZXdRdWV1ZSA9IHRoaXMuc2h1ZmZsZUFycmF5KHJldmlld1F1ZXVlKTtcbiAgICB0aGlzLmNhcmRzVG9SZXBlYXQgPSBbXTtcbiAgICB0aGlzLmN1cnJlbnRDYXJkSW5kZXggPSAwO1xufTtcbkxlYXJuaW5nTW9kYWwucHJvdG90eXBlLnNodWZmbGVBcnJheSA9IGZ1bmN0aW9uKGFycmF5OiBhbnlbXSk6IGFueVtdIHtcbiAgICBmb3IgKGxldCBpID0gYXJyYXkubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkgeyBjb25zdCBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKGkgKyAxKSk7IFthcnJheVtpXSwgYXJyYXlbal1dID0gW2FycmF5W2pdLCBhcnJheVtpXV07IH1cbiAgICByZXR1cm4gYXJyYXk7XG59O1xuTGVhcm5pbmdNb2RhbC5wcm90b3R5cGUub25PcGVuID0gZnVuY3Rpb24oKSB7IHRoaXMuZGlzcGxheUNhcmQoKTsgfTtcbkxlYXJuaW5nTW9kYWwucHJvdG90eXBlLm9uQ2xvc2UgPSBmdW5jdGlvbigpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfTtcbkxlYXJuaW5nTW9kYWwucHJvdG90eXBlLmRpc3BsYXlDYXJkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBjb25zdCBjYXJkID0gdGhpcy5yZXZpZXdRdWV1ZVt0aGlzLmN1cnJlbnRDYXJkSW5kZXhdO1xuICAgIGlmICghY2FyZCkge1xuICAgICAgICBpZiAodGhpcy5jYXJkc1RvUmVwZWF0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMucmV2aWV3UXVldWUgPSB0aGlzLnNodWZmbGVBcnJheSh0aGlzLmNhcmRzVG9SZXBlYXQpOyB0aGlzLmNhcmRzVG9SZXBlYXQgPSBbXTsgdGhpcy5jdXJyZW50Q2FyZEluZGV4ID0gMDsgdGhpcy5kaXNwbGF5Q2FyZCgpO1xuICAgICAgICB9IGVsc2UgeyBuZXcgTm90aWNlKCdTZXNqYSBuYXVraSB6YWtvxYRjem9uYSEnKTsgdGhpcy5jbG9zZSgpOyB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiAnZmxvd2NhcmRzLWNvbnRhaW5lcicgfSk7XG4gICAgY29uc3QgcXVlc3Rpb25FbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6ICdmbG93Y2FyZHMtcXVlc3Rpb24nIH0pO1xuICAgIE1hcmtkb3duUmVuZGVyZXIucmVuZGVyKHRoaXMuYXBwLCBjYXJkLnF1ZXN0aW9uLCBxdWVzdGlvbkVsLCBjYXJkLnNvdXJjZVBhdGgsIHRoaXMucGx1Z2luKTtcbiAgICBjb25zdCBhbnN3ZXJDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZmxvd2NhcmRzLWFuc3dlcicsIGF0dHI6IHsgJ3N0eWxlJzogJ2Rpc3BsYXk6IG5vbmU7JyB9IH0pO1xuICAgIGNvbnN0IHByZUFuc3dlckJ1dHRvbnMgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZmxvd2NhcmRzLWJ1dHRvbnMtY29udGFpbmVyJyB9KTtcbiAgICBjb25zdCBzaG93QW5zd2VyQnRuID0gcHJlQW5zd2VyQnV0dG9ucy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnUG9rYcW8IG9kcG93aWVkxbonIH0pO1xuICAgIGNvbnN0IHNraXBCdG4gPSBwcmVBbnN3ZXJCdXR0b25zLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdQb21pxYQnLCBjbHM6ICdtb2Qtd2FybmluZycgfSk7XG4gICAgc2tpcEJ0bi5vbmNsaWNrID0gKCkgPT4geyB0aGlzLmN1cnJlbnRDYXJkSW5kZXgrKzsgdGhpcy5kaXNwbGF5Q2FyZCgpOyB9O1xuICAgIGNvbnN0IHBvc3RBbnN3ZXJCdXR0b25zID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogJ2Zsb3djYXJkcy1idXR0b25zLWNvbnRhaW5lcicsIGF0dHI6IHsgJ3N0eWxlJzogJ2Rpc3BsYXk6IG5vbmU7JyB9IH0pO1xuICAgIHNob3dBbnN3ZXJCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgTWFya2Rvd25SZW5kZXJlci5yZW5kZXIodGhpcy5hcHAsIGNhcmQuYW5zd2VyLCBhbnN3ZXJDb250YWluZXIsIGNhcmQuc291cmNlUGF0aCwgdGhpcy5wbHVnaW4pO1xuICAgICAgICBhbnN3ZXJDb250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7IHByZUFuc3dlckJ1dHRvbnMuc3R5bGUuZGlzcGxheSA9ICdub25lJzsgcG9zdEFuc3dlckJ1dHRvbnMuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICB9O1xuICAgIGNvbnN0IGhhbmRsZUFuc3dlciA9IGFzeW5jIChyYXRpbmc6ICdhZ2FpbicgfCAnaGFyZCcgfCAnb2snIHwgJ2Vhc3knKSA9PiB7XG4gICAgICAgIGlmIChyYXRpbmcgPT09ICdhZ2FpbicpIHsgdGhpcy5jYXJkc1RvUmVwZWF0LnB1c2goY2FyZCk7IH1cbiAgICAgICAgdGhpcy5wbHVnaW4ucHJvY2Vzc1JldmlldyhjYXJkLmlkLCByYXRpbmcpO1xuICAgICAgICB0aGlzLmN1cnJlbnRDYXJkSW5kZXgrKzsgdGhpcy5kaXNwbGF5Q2FyZCgpO1xuICAgIH07XG4gICAgY29uc3QgYWdhaW5CdG4gPSBwb3N0QW5zd2VyQnV0dG9ucy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnQWdhaW4nIH0pOyBhZ2FpbkJ0bi5vbmNsaWNrID0gKCkgPT4gaGFuZGxlQW5zd2VyKCdhZ2FpbicpO1xuICAgIGNvbnN0IGhhcmRCdG4gPSBwb3N0QW5zd2VyQnV0dG9ucy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnSGFyZCcgfSk7IGhhcmRCdG4ub25jbGljayA9ICgpID0+IGhhbmRsZUFuc3dlcignaGFyZCcpO1xuICAgIGNvbnN0IG9rQnRuID0gcG9zdEFuc3dlckJ1dHRvbnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ09rJyB9KTsgb2tCdG4ub25jbGljayA9ICgpID0+IGhhbmRsZUFuc3dlcignb2snKTtcbiAgICBjb25zdCBlYXN5QnRuID0gcG9zdEFuc3dlckJ1dHRvbnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ0Vhc3knIH0pOyBlYXN5QnRuLm9uY2xpY2sgPSAoKSA9PiBoYW5kbGVBbnN3ZXIoJ2Vhc3knKTtcbn07XG5GbG93Q2FyZHNQbHVnaW4ucHJvdG90eXBlLmxvYWRQbHVnaW5EYXRhID0gYXN5bmMgZnVuY3Rpb24oKSB7IHRoaXMuZGF0YSA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfREFUQSwgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTsgfTtcbkZsb3dDYXJkc1BsdWdpbi5wcm90b3R5cGUuc2F2ZVBsdWdpbkRhdGEgPSBhc3luYyBmdW5jdGlvbigpIHsgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLmRhdGEpOyB9O1xuRmxvd0NhcmRzUGx1Z2luLnByb3RvdHlwZS5nZXRBbGxEZWNrcyA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGFsbENhcmRzID0gT2JqZWN0LnZhbHVlcyh0aGlzLmRhdGEuY2FyZHMpO1xuICAgIGNvbnN0IGRlY2tTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IGNhcmQgb2YgYWxsQ2FyZHMpIHsgZm9yIChjb25zdCBkZWNrIG9mIGNhcmQuZGVja3MpIHsgZGVja1NldC5hZGQoZGVjayk7IH0gfVxuICAgIHJldHVybiBBcnJheS5mcm9tKGRlY2tTZXQpLnNvcnQoKTtcbn07XG5GbG93Q2FyZHNQbHVnaW4ucHJvdG90eXBlLnN0YXJ0TGVhcm5pbmdTZXNzaW9uID0gZnVuY3Rpb24oZGVja3M6IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgcmV2aWV3UXVldWUgPSB0aGlzLmdldENhcmRzRm9yUmV2aWV3KGRlY2tzKTtcbiAgICBpZiAocmV2aWV3UXVldWUubGVuZ3RoID4gMCkgeyBuZXcgTGVhcm5pbmdNb2RhbCh0aGlzLmFwcCwgdGhpcywgcmV2aWV3UXVldWUpLm9wZW4oKTsgfVxuICAgIGVsc2UgeyBuZXcgTm90aWNlKCdCcmFrIGZpc3playBkbyBwb3d0w7Nya2kgdyB3eWJyYW55Y2ggdGFsaWFjaCEnKTsgfVxufTtcbkZsb3dDYXJkc1BsdWdpbi5wcm90b3R5cGUuZ2V0Q2FyZHNGb3JSZXZpZXcgPSBmdW5jdGlvbihkZWNrczogc3RyaW5nW10pOiBDYXJkU3RhdGVbXSB7XG4gICAgY29uc3Qgbm93ID0gbW9tZW50KCk7XG4gICAgY29uc3QgYWxsQ2FyZHMgPSBPYmplY3QudmFsdWVzKHRoaXMuZGF0YS5jYXJkcyk7XG4gICAgcmV0dXJuIGFsbENhcmRzLmZpbHRlcihjYXJkID0+IHtcbiAgICAgICAgY29uc3QgaW5TZWxlY3RlZERlY2sgPSBjYXJkLmRlY2tzLnNvbWUoZCA9PiBkZWNrcy5pbmNsdWRlcyhkKSk7XG4gICAgICAgIGlmICghaW5TZWxlY3RlZERlY2spIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGNhcmQuc3RhdHVzID09PSAnbmV3JykgcmV0dXJuIHRydWU7XG4gICAgICAgIGlmIChjYXJkLmR1ZURhdGUgJiYgbW9tZW50KGNhcmQuZHVlRGF0ZSkuaXNTYW1lT3JCZWZvcmUobm93KSkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG59O1xuRmxvd0NhcmRzUGx1Z2luLnByb3RvdHlwZS5wcm9jZXNzUmV2aWV3ID0gZnVuY3Rpb24oY2FyZElkOiBzdHJpbmcsIHJhdGluZzogJ2FnYWluJyB8ICdoYXJkJyB8ICdvaycgfCAnZWFzeScpIHtcbiAgICBjb25zdCBjYXJkID0gdGhpcy5kYXRhLmNhcmRzW2NhcmRJZF07XG4gICAgaWYgKCFjYXJkKSByZXR1cm47IGxldCBuZXdJbnRlcnZhbDsgY29uc3Qgb2xkU3RhdHVzID0gY2FyZC5zdGF0dXM7XG4gICAgaWYgKHJhdGluZyA9PT0gJ2FnYWluJykge1xuICAgICAgICBjYXJkLmludGVydmFsID0gMDsgY2FyZC5zdGF0dXMgPSAnbGVhcm5pbmcnOyBuZXdJbnRlcnZhbCA9IDEgLyAoMjQgKiA2MCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG9sZFN0YXR1cyA9PT0gJ25ldycgfHwgb2xkU3RhdHVzID09PSAnbGVhcm5pbmcnKSB7XG4gICAgICAgICAgICBuZXdJbnRlcnZhbCA9IHJhdGluZyA9PT0gJ2hhcmQnID8gMSA6IHJhdGluZyA9PT0gJ29rJyA/IDMgOiA1O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3SW50ZXJ2YWwgPSByYXRpbmcgPT09ICdoYXJkJyA/IGNhcmQuaW50ZXJ2YWwgKiAxLjIgOiByYXRpbmcgPT09ICdvaycgPyBjYXJkLmludGVydmFsICogY2FyZC5lYXNlRmFjdG9yIDogY2FyZC5pbnRlcnZhbCAqIGNhcmQuZWFzZUZhY3RvciAqIDEuMztcbiAgICAgICAgICAgIGlmIChyYXRpbmcgPT09ICdoYXJkJykgY2FyZC5lYXNlRmFjdG9yID0gTWF0aC5tYXgoMS4zLCBjYXJkLmVhc2VGYWN0b3IgLSAwLjE1KTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHJhdGluZyA9PT0gJ2Vhc3knKSBjYXJkLmVhc2VGYWN0b3IgKz0gMC4xNTtcbiAgICAgICAgfVxuICAgICAgICBjYXJkLmludGVydmFsID0gbmV3SW50ZXJ2YWw7IGNhcmQuc3RhdHVzID0gJ3Jldmlldyc7XG4gICAgfVxuICAgIGNvbnN0IGR1ZURhdGUgPSBtb21lbnQoKS5hZGQobmV3SW50ZXJ2YWwsICdkYXlzJyk7XG4gICAgY2FyZC5kdWVEYXRlID0gZHVlRGF0ZS5mb3JtYXQoKTsgdGhpcy5zYXZlUGx1Z2luRGF0YSgpO1xufTtcbkZsb3dDYXJkc1BsdWdpbi5wcm90b3R5cGUucGFyc2VWYXVsdEZvckZsYXNoY2FyZHMgPSBhc3luYyBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTsgY29uc3QgY2FyZHNJblZhdWx0OiBSZWNvcmQ8c3RyaW5nLCBDYXJkU3RhdGU+ID0ge307XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICAgIGNvbnN0IGZpbGVDb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZChmaWxlKTsgbGV0IGZpbGVDb250ZW50TGluZXMgPSBmaWxlQ29udGVudC5zcGxpdCgnXFxuJyk7IGxldCBmaWxlTW9kaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgcmF3Q2FyZHMgPSB0aGlzLmZpbmRSYXdDYXJkcyhmaWxlQ29udGVudExpbmVzKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IHJhd0NhcmRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBjb25zdCByYXdDYXJkID0gcmF3Q2FyZHNbaV07IGxldCBjYXJkSWQgPSByYXdDYXJkLmlkO1xuICAgICAgICAgICAgaWYgKCFjYXJkSWQpIHtcbiAgICAgICAgICAgICAgICBjYXJkSWQgPSBgZmMtJHtEYXRlLm5vdygpfSR7aX1gOyBjb25zdCBsaW5lVG9Nb2RpZnkgPSBmaWxlQ29udGVudExpbmVzW3Jhd0NhcmQuc2VwYXJhdG9yTGluZV07XG4gICAgICAgICAgICAgICAgZmlsZUNvbnRlbnRMaW5lc1tyYXdDYXJkLnNlcGFyYXRvckxpbmVdID0gYCR7bGluZVRvTW9kaWZ5LnRyaW1FbmQoKX0gXiR7Y2FyZElkfWA7IGZpbGVNb2RpZmllZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhLmNhcmRzW2NhcmRJZF0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGEuY2FyZHNbY2FyZElkXS5xdWVzdGlvbiA9IHJhd0NhcmQucXVlc3Rpb247IHRoaXMuZGF0YS5jYXJkc1tjYXJkSWRdLmFuc3dlciA9IHJhd0NhcmQuYW5zd2VyO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YS5jYXJkc1tjYXJkSWRdLmRlY2tzID0gcmF3Q2FyZC5kZWNrczsgdGhpcy5kYXRhLmNhcmRzW2NhcmRJZF0uc291cmNlUGF0aCA9IGZpbGUucGF0aDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhLmNhcmRzW2NhcmRJZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiBjYXJkSWQsIHF1ZXN0aW9uOiByYXdDYXJkLnF1ZXN0aW9uLCBhbnN3ZXI6IHJhd0NhcmQuYW5zd2VyLCBkZWNrczogcmF3Q2FyZC5kZWNrcyxcbiAgICAgICAgICAgICAgICAgICAgc291cmNlUGF0aDogZmlsZS5wYXRoLCBzb3VyY2VMaW5lOiByYXdDYXJkLnNlcGFyYXRvckxpbmUsIHN0YXR1czogJ25ldycsXG4gICAgICAgICAgICAgICAgICAgIGR1ZURhdGU6IG51bGwsIGludGVydmFsOiAwLCBlYXNlRmFjdG9yOiAyLjVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FyZHNJblZhdWx0W2NhcmRJZF0gPSB0aGlzLmRhdGEuY2FyZHNbY2FyZElkXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmlsZU1vZGlmaWVkKSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCBmaWxlQ29udGVudExpbmVzLmpvaW4oJ1xcbicpKTsgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGlkIGluIHRoaXMuZGF0YS5jYXJkcykgeyBpZiAoIWNhcmRzSW5WYXVsdFtpZF0pIHsgZGVsZXRlIHRoaXMuZGF0YS5jYXJkc1tpZF07IH0gfVxuICAgIG5ldyBOb3RpY2UoYEluZGVrcyB6YWt0dWFsaXpvd2FueS4gxZpsZWR6b255Y2ggZmlzemVrOiAke09iamVjdC5rZXlzKHRoaXMuZGF0YS5jYXJkcykubGVuZ3RofWApO1xuICAgIGF3YWl0IHRoaXMuc2F2ZVBsdWdpbkRhdGEoKTtcbn07XG5GbG93Q2FyZHNQbHVnaW4ucHJvdG90eXBlLmZpbmRSYXdDYXJkcyA9IGZ1bmN0aW9uKGxpbmVzOiBzdHJpbmdbXSk6IHsgcXVlc3Rpb246IHN0cmluZywgYW5zd2VyOiBzdHJpbmcsIGRlY2tzOiBzdHJpbmdbXSwgaWQ6IHN0cmluZyB8IG51bGwsIHNlcGFyYXRvckxpbmU6IG51bWJlciB9W10ge1xuICAgIGNvbnN0IGZvdW5kQ2FyZHMgPSBbXTsgY29uc3Qgc2VwYXJhdG9yUmVnZXggPSAvXlxcP1xccyooKD86I2RlY2tcXC9cXFMrXFxzKikrKSg/OlxccypcXF4oXFxTKykpPy87XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbUVuZCgpOyBjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goc2VwYXJhdG9yUmVnZXgpO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0aW9uTGluZXMgPSBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSBpIC0gMTsgaiA+PSAwOyBqLS0pIHsgaWYgKGxpbmVzW2pdLnRyaW0oKSA9PT0gJycpIGJyZWFrOyBxdWVzdGlvbkxpbmVzLnVuc2hpZnQobGluZXNbal0pOyB9XG4gICAgICAgICAgICBjb25zdCBhbnN3ZXJMaW5lcyA9IFtdO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgbGluZXMubGVuZ3RoOyBqKyspIHsgaWYgKGxpbmVzW2pdLnRyaW0oKSA9PT0gJycpIGJyZWFrOyBhbnN3ZXJMaW5lcy5wdXNoKGxpbmVzW2pdKTsgfVxuICAgICAgICAgICAgaWYgKHF1ZXN0aW9uTGluZXMubGVuZ3RoID4gMCAmJiBhbnN3ZXJMaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFnU3RyaW5nID0gbWF0Y2hbMV07IGNvbnN0IGNhcmRJZCA9IG1hdGNoWzJdIHx8IG51bGw7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVja3MgPSB0YWdTdHJpbmcudHJpbSgpLnNwbGl0KC9cXHMrLykubWFwKHRhZyA9PiB0YWcuc3Vic3RyaW5nKDEpKTtcbiAgICAgICAgICAgICAgICBmb3VuZENhcmRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBxdWVzdGlvbjogcXVlc3Rpb25MaW5lcy5qb2luKCdcXG4nKSwgYW5zd2VyOiBhbnN3ZXJMaW5lcy5qb2luKCdcXG4nKSxcbiAgICAgICAgICAgICAgICAgICAgZGVja3M6IGRlY2tzLCBpZDogY2FyZElkLCBzZXBhcmF0b3JMaW5lOiBpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kQ2FyZHM7XG59O1xuIl19