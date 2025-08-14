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
// --- WSZYSTKIE KLASY MODALI (bez zmian, skrócone dla czytelności) ---
class DeckSelectionModal extends obsidian_1.FuzzySuggestModal {
    constructor(app, plugin, onChoose) {
        super(app);
        this.plugin = plugin;
        this.allDecks = this.plugin.getAllDecks();
        this.onChoose = onChoose;
    }
    getItems() { return ["* Wszystkie talie *", ...this.allDecks]; }
    getItemText(item) { return item; }
    onChooseItem(selectedDeck, evt) { this.onChoose(selectedDeck); }
}
class BrowserModal extends obsidian_1.Modal {
    constructor(app, plugin, cards) {
        super(app);
        this.currentCardIndex = 0;
        this.plugin = plugin;
        this.cards = cards.sort((a, b) => a.sourceLine - b.sourceLine);
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
        const container = this.contentEl.createDiv({ cls: 'flowcards-browser-container' });
        const navHeader = container.createDiv({ cls: 'flowcards-browser-nav' });
        const prevBtn = navHeader.createEl('button', { text: '<< Poprzednia' });
        navHeader.createSpan({ text: `Karta ${this.currentCardIndex + 1} z ${this.cards.length}` });
        const nextBtn = navHeader.createEl('button', { text: 'Następna >>' });
        prevBtn.disabled = this.currentCardIndex === 0;
        nextBtn.disabled = this.currentCardIndex === this.cards.length - 1;
        prevBtn.onclick = () => { this.currentCardIndex--; this.displayCard(); };
        nextBtn.onclick = () => { this.currentCardIndex++; this.displayCard(); };
        const sourceLinkContainer = container.createDiv({ cls: 'flowcards-source-link-container' });
        const sourceLink = sourceLinkContainer.createEl('a', { text: `Źródło: ${card.sourcePath}`, cls: 'flowcards-source-link' });
        sourceLink.onclick = () => { this.close(); this.plugin.navigateToSource(card); };
        container.createEl('h3', { text: 'Pytanie' });
        const questionEl = container.createDiv({ cls: 'flowcards-browser-content' });
        obsidian_1.MarkdownRenderer.render(this.app, card.question, questionEl, card.sourcePath, this.plugin);
        container.createEl('h3', { text: 'Odpowiedź' });
        const answerEl = container.createDiv({ cls: 'flowcards-browser-content' });
        obsidian_1.MarkdownRenderer.render(this.app, card.answer, answerEl, card.sourcePath, this.plugin);
    }
}
class LearningModal extends obsidian_1.Modal {
    constructor(app, plugin, reviewQueue) {
        super(app);
        this.currentCardIndex = 0;
        this.cardsToRepeat = [];
        this.plugin = plugin;
        this.reviewQueue = this.shuffleArray(reviewQueue);
    }
    onOpen() { this.displayCard(); }
    onClose() { this.contentEl.empty(); }
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    displayCard() {
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
        const sourceLinkContainer = container.createDiv({ cls: 'flowcards-source-link-container flowcards-source-link-learning' });
        const sourceLink = sourceLinkContainer.createEl('a', { text: 'Przejdź do źródła', cls: 'flowcards-source-link' });
        sourceLink.onclick = () => { this.close(); this.plugin.navigateToSource(card); };
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
    }
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
                callback: () => __awaiter(this, void 0, void 0, function* () { yield this.loadPluginData(); yield this.parseVaultForFlashcards(); }),
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
            this.addCommand({
                id: 'browse-cards-in-active-note',
                name: 'Przeglądaj fiszki w tej notatce',
                callback: () => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (!activeFile) {
                        new obsidian_1.Notice("Otwórz najpierw notatkę, którą chcesz przejrzeć.");
                        return;
                    }
                    const allCards = Object.values(this.data.cards);
                    const cardsInNote = allCards.filter(card => card.sourcePath === activeFile.path);
                    if (cardsInNote.length > 0) {
                        new BrowserModal(this.app, this, cardsInNote).open();
                    }
                    else {
                        new obsidian_1.Notice("W tej notatce nie znaleziono żadnych fiszek FlowCards.");
                    }
                },
            });
        });
    }
    navigateToSource(card) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.app.workspace.openLinkText(card.sourcePath, card.sourcePath, false, { eState: { line: card.sourceLine } });
        });
    }
    loadPluginData() {
        return __awaiter(this, void 0, void 0, function* () { this.data = Object.assign({}, DEFAULT_DATA, yield this.loadData()); });
    }
    savePluginData() {
        return __awaiter(this, void 0, void 0, function* () { yield this.saveData(this.data); });
    }
    getAllDecks() {
        const allCards = Object.values(this.data.cards);
        const deckSet = new Set();
        for (const card of allCards) {
            for (const deck of card.decks) {
                deckSet.add(deck);
            }
        }
        return Array.from(deckSet).sort();
    }
    startLearningSession(decks) {
        const reviewQueue = this.getCardsForReview(decks);
        if (reviewQueue.length > 0) {
            new LearningModal(this.app, this, reviewQueue).open();
        }
        else {
            new obsidian_1.Notice('Brak fiszek do powtórki w wybranych taliach!');
        }
    }
    getCardsForReview(decks) {
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
    }
    processReview(cardId, rating) {
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
    }
    // --- KLUCZOWE ZMIANY TUTAJ ---
    parseVaultForFlashcards() {
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
                        fileContentLines[rawCard.separatorLine] = `${lineToModify.trimEnd()} @@${cardId}`;
                        fileModified = true;
                    }
                    if (this.data.cards[cardId]) {
                        this.data.cards[cardId].question = rawCard.question;
                        this.data.cards[cardId].answer = rawCard.answer;
                        this.data.cards[cardId].decks = rawCard.decks;
                        this.data.cards[cardId].sourcePath = file.path;
                        this.data.cards[cardId].sourceLine = rawCard.separatorLine;
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
    }
    findRawCards(lines) {
        const foundCards = [];
        const separatorRegex = /^\?\s*((?:#deck\/\S+\s*)+)(?:\s*@@(\S+))?/; // NOWY REGEX
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
                    const cardId = match[2] || null; // Grupa 2 to teraz nasze ID
                    const decks = tagString.trim().split(/\s+/).map(tag => tag.substring(1));
                    foundCards.push({
                        question: questionLines.join('\n'), answer: answerLines.join('\n'),
                        decks: decks, id: cardId, separatorLine: i
                    });
                }
            }
        }
        return foundCards;
    }
}
exports.default = FlowCardsPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBa0c7QUFDbEcsdUNBQWtDO0FBU2xDLE1BQU0sWUFBWSxHQUFrQixFQUFFLEtBQUssRUFBRSxFQUFFLEdBQUcsQ0FBQztBQUVuRCx1RUFBdUU7QUFDdkUsTUFBTSxrQkFBbUIsU0FBUSw0QkFBeUI7SUFJdEQsWUFBWSxHQUFRLEVBQUUsTUFBdUIsRUFBRSxRQUF3QztRQUNuRixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQzFHLENBQUM7SUFDRCxRQUFRLEtBQWUsT0FBTyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRSxXQUFXLENBQUMsSUFBWSxJQUFZLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNsRCxZQUFZLENBQUMsWUFBb0IsRUFBRSxHQUErQixJQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQzdHO0FBQ0QsTUFBTSxZQUFhLFNBQVEsZ0JBQUs7SUFFNUIsWUFBWSxHQUFRLEVBQUUsTUFBdUIsRUFBRSxLQUFrQjtRQUM3RCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFGc0QscUJBQWdCLEdBQVcsQ0FBQyxDQUFDO1FBRWxGLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVB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QUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDekUsVUFBVSxDQUFDLElBQUksQ0FBQzt3QkFDWixRQUFRLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7d0JBQ2xFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsQ0FBQztxQkFDN0MsQ0FBQyxDQUFDO2dCQUNQLENBQUM7WUFDTCxDQUFDO1FBQ0wsQ0FBQztRQUNELE9BQU8sVUFBVSxDQUFDO0lBQ3RCLENBQUM7Q0FDSjtBQXpKRCxrQ0F5SkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIFBsdWdpbiwgTm90aWNlLCBURmlsZSwgTW9kYWwsIE1hcmtkb3duUmVuZGVyZXIsIEZ1enp5U3VnZ2VzdE1vZGFsIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuXG4vLyAtLS0gSU5URVJGRUpTWSBJIFRZUFkgLS0tXG50eXBlIENhcmRTdGF0dXMgPSAnbmV3JyB8ICdsZWFybmluZycgfCAncmV2aWV3JztcbmludGVyZmFjZSBDYXJkU3RhdGUge1xuICAgIGlkOiBzdHJpbmc7IHF1ZXN0aW9uOiBzdHJpbmc7IGFuc3dlcjogc3RyaW5nOyBkZWNrczogc3RyaW5nW107IHNvdXJjZVBhdGg6IHN0cmluZzsgc291cmNlTGluZTogbnVtYmVyO1xuICAgIHN0YXR1czogQ2FyZFN0YXR1czsgZHVlRGF0ZTogc3RyaW5nIHwgbnVsbDsgaW50ZXJ2YWw6IG51bWJlcjsgZWFzZUZhY3RvcjogbnVtYmVyO1xufVxuaW50ZXJmYWNlIEZsb3dDYXJkc0RhdGEgeyBjYXJkczogUmVjb3JkPHN0cmluZywgQ2FyZFN0YXRlPjsgfVxuY29uc3QgREVGQVVMVF9EQVRBOiBGbG93Q2FyZHNEYXRhID0geyBjYXJkczoge30sIH07XG5cbi8vIC0tLSBXU1pZU1RLSUUgS0xBU1kgTU9EQUxJIChiZXogem1pYW4sIHNrcsOzY29uZSBkbGEgY3p5dGVsbm/Fm2NpKSAtLS1cbmNsYXNzIERlY2tTZWxlY3Rpb25Nb2RhbCBleHRlbmRzIEZ1enp5U3VnZ2VzdE1vZGFsPHN0cmluZz4ge1xuICAgIHByaXZhdGUgcGx1Z2luOiBGbG93Q2FyZHNQbHVnaW47XG4gICAgcHJpdmF0ZSBhbGxEZWNrczogc3RyaW5nW107XG4gICAgcHJpdmF0ZSBvbkNob29zZTogKHNlbGVjdGVkRGVjazogc3RyaW5nKSA9PiB2b2lkO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IEZsb3dDYXJkc1BsdWdpbiwgb25DaG9vc2U6IChzZWxlY3RlZERlY2s6IHN0cmluZykgPT4gdm9pZCkge1xuICAgICAgICBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgdGhpcy5hbGxEZWNrcyA9IHRoaXMucGx1Z2luLmdldEFsbERlY2tzKCk7IHRoaXMub25DaG9vc2UgPSBvbkNob29zZTtcbiAgICB9XG4gICAgZ2V0SXRlbXMoKTogc3RyaW5nW10geyByZXR1cm4gW1wiKiBXc3p5c3RraWUgdGFsaWUgKlwiLCAuLi50aGlzLmFsbERlY2tzXTsgfVxuICAgIGdldEl0ZW1UZXh0KGl0ZW06IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBpdGVtOyB9XG4gICAgb25DaG9vc2VJdGVtKHNlbGVjdGVkRGVjazogc3RyaW5nLCBldnQ6IE1vdXNlRXZlbnQgfCBLZXlib2FyZEV2ZW50KTogdm9pZCB7IHRoaXMub25DaG9vc2Uoc2VsZWN0ZWREZWNrKTsgfVxufVxuY2xhc3MgQnJvd3Nlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHByaXZhdGUgcGx1Z2luOiBGbG93Q2FyZHNQbHVnaW47IHByaXZhdGUgY2FyZHM6IENhcmRTdGF0ZVtdOyBwcml2YXRlIGN1cnJlbnRDYXJkSW5kZXg6IG51bWJlciA9IDA7XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogRmxvd0NhcmRzUGx1Z2luLCBjYXJkczogQ2FyZFN0YXRlW10pIHtcbiAgICAgICAgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IHRoaXMuY2FyZHMgPSBjYXJkcy5zb3J0KChhLCBiKSA9PiBhLnNvdXJjZUxpbmUgLSBiLnNvdXJjZUxpbmUpO1xuICAgIH1cbiAgICBvbk9wZW4oKSB7IHRoaXMuZGlzcGxheUNhcmQoKTsgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbiAgICBkaXNwbGF5Q2FyZCgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICAgICAgY29uc3QgY2FyZCA9IHRoaXMuY2FyZHNbdGhpcy5jdXJyZW50Q2FyZEluZGV4XTtcbiAgICAgICAgaWYgKCFjYXJkKSB7IHRoaXMuY2xvc2UoKTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogJ2Zsb3djYXJkcy1icm93c2VyLWNvbnRhaW5lcicgfSk7XG4gICAgICAgIGNvbnN0IG5hdkhlYWRlciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6ICdmbG93Y2FyZHMtYnJvd3Nlci1uYXYnIH0pO1xuICAgICAgICBjb25zdCBwcmV2QnRuID0gbmF2SGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICc8PCBQb3ByemVkbmlhJyB9KTtcbiAgICAgICAgbmF2SGVhZGVyLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgS2FydGEgJHt0aGlzLmN1cnJlbnRDYXJkSW5kZXggKyAxfSB6ICR7dGhpcy5jYXJkcy5sZW5ndGh9YCB9KTtcbiAgICAgICAgY29uc3QgbmV4dEJ0biA9IG5hdkhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnTmFzdMSZcG5hID4+JyB9KTtcbiAgICAgICAgcHJldkJ0bi5kaXNhYmxlZCA9IHRoaXMuY3VycmVudENhcmRJbmRleCA9PT0gMDtcbiAgICAgICAgbmV4dEJ0bi5kaXNhYmxlZCA9IHRoaXMuY3VycmVudENhcmRJbmRleCA9PT0gdGhpcy5jYXJkcy5sZW5ndGggLSAxO1xuICAgICAgICBwcmV2QnRuLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMuY3VycmVudENhcmRJbmRleC0tOyB0aGlzLmRpc3BsYXlDYXJkKCk7IH07XG4gICAgICAgIG5leHRCdG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5jdXJyZW50Q2FyZEluZGV4Kys7IHRoaXMuZGlzcGxheUNhcmQoKTsgfTtcbiAgICAgICAgY29uc3Qgc291cmNlTGlua0NvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6ICdmbG93Y2FyZHMtc291cmNlLWxpbmstY29udGFpbmVyJyB9KVxuICAgICAgICBjb25zdCBzb3VyY2VMaW5rID0gc291cmNlTGlua0NvbnRhaW5lci5jcmVhdGVFbCgnYScsIHsgdGV4dDogYMW5csOzZMWCbzogJHtjYXJkLnNvdXJjZVBhdGh9YCwgY2xzOiAnZmxvd2NhcmRzLXNvdXJjZS1saW5rJyB9KTtcbiAgICAgICAgc291cmNlTGluay5vbmNsaWNrID0gKCkgPT4geyB0aGlzLmNsb3NlKCk7IHRoaXMucGx1Z2luLm5hdmlnYXRlVG9Tb3VyY2UoY2FyZCk7IH07XG4gICAgICAgIGNvbnRhaW5lci5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdQeXRhbmllJyB9KTtcbiAgICAgICAgY29uc3QgcXVlc3Rpb25FbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6ICdmbG93Y2FyZHMtYnJvd3Nlci1jb250ZW50JyB9KTtcbiAgICAgICAgTWFya2Rvd25SZW5kZXJlci5yZW5kZXIodGhpcy5hcHAsIGNhcmQucXVlc3Rpb24sIHF1ZXN0aW9uRWwsIGNhcmQuc291cmNlUGF0aCwgdGhpcy5wbHVnaW4pO1xuICAgICAgICBjb250YWluZXIuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnT2Rwb3dpZWTFuicgfSk7XG4gICAgICAgIGNvbnN0IGFuc3dlckVsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogJ2Zsb3djYXJkcy1icm93c2VyLWNvbnRlbnQnIH0pO1xuICAgICAgICBNYXJrZG93blJlbmRlcmVyLnJlbmRlcih0aGlzLmFwcCwgY2FyZC5hbnN3ZXIsIGFuc3dlckVsLCBjYXJkLnNvdXJjZVBhdGgsIHRoaXMucGx1Z2luKTtcbiAgICB9XG59XG5jbGFzcyBMZWFybmluZ01vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHByaXZhdGUgcGx1Z2luOiBGbG93Q2FyZHNQbHVnaW47IHByaXZhdGUgcmV2aWV3UXVldWU6IENhcmRTdGF0ZVtdOyBwcml2YXRlIGN1cnJlbnRDYXJkSW5kZXg6IG51bWJlciA9IDA7IHByaXZhdGUgY2FyZHNUb1JlcGVhdDogQ2FyZFN0YXRlW10gPSBbXTtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBGbG93Q2FyZHNQbHVnaW4sIHJldmlld1F1ZXVlOiBDYXJkU3RhdGVbXSkge1xuICAgICAgICBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgdGhpcy5yZXZpZXdRdWV1ZSA9IHRoaXMuc2h1ZmZsZUFycmF5KHJldmlld1F1ZXVlKTtcbiAgICB9XG4gICAgb25PcGVuKCkgeyB0aGlzLmRpc3BsYXlDYXJkKCk7IH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG4gICAgcHJpdmF0ZSBzaHVmZmxlQXJyYXkoYXJyYXk6IGFueVtdKTogYW55W10ge1xuICAgICAgICBmb3IgKGxldCBpID0gYXJyYXkubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkgeyBjb25zdCBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKGkgKyAxKSk7IFthcnJheVtpXSwgYXJyYXlbal1dID0gW2FycmF5W2pdLCBhcnJheVtpXV07IH1cbiAgICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH1cbiAgICBkaXNwbGF5Q2FyZCgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICAgICAgY29uc3QgY2FyZCA9IHRoaXMucmV2aWV3UXVldWVbdGhpcy5jdXJyZW50Q2FyZEluZGV4XTtcbiAgICAgICAgaWYgKCFjYXJkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5jYXJkc1RvUmVwZWF0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJldmlld1F1ZXVlID0gdGhpcy5zaHVmZmxlQXJyYXkodGhpcy5jYXJkc1RvUmVwZWF0KTsgdGhpcy5jYXJkc1RvUmVwZWF0ID0gW107IHRoaXMuY3VycmVudENhcmRJbmRleCA9IDA7IHRoaXMuZGlzcGxheUNhcmQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7IG5ldyBOb3RpY2UoJ1Nlc2phIG5hdWtpIHpha2/FhGN6b25hIScpOyB0aGlzLmNsb3NlKCk7IH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdmbG93Y2FyZHMtY29udGFpbmVyJyB9KTtcbiAgICAgICAgY29uc3Qgc291cmNlTGlua0NvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6ICdmbG93Y2FyZHMtc291cmNlLWxpbmstY29udGFpbmVyIGZsb3djYXJkcy1zb3VyY2UtbGluay1sZWFybmluZycgfSk7XG4gICAgICAgIGNvbnN0IHNvdXJjZUxpbmsgPSBzb3VyY2VMaW5rQ29udGFpbmVyLmNyZWF0ZUVsKCdhJywgeyB0ZXh0OiAnUHJ6ZWpkxbogZG8gxbpyw7NkxYJhJywgY2xzOiAnZmxvd2NhcmRzLXNvdXJjZS1saW5rJyB9KTtcbiAgICAgICAgc291cmNlTGluay5vbmNsaWNrID0gKCkgPT4geyB0aGlzLmNsb3NlKCk7IHRoaXMucGx1Z2luLm5hdmlnYXRlVG9Tb3VyY2UoY2FyZCk7IH07XG4gICAgICAgIGNvbnN0IHF1ZXN0aW9uRWwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZmxvd2NhcmRzLXF1ZXN0aW9uJyB9KTtcbiAgICAgICAgTWFya2Rvd25SZW5kZXJlci5yZW5kZXIodGhpcy5hcHAsIGNhcmQucXVlc3Rpb24sIHF1ZXN0aW9uRWwsIGNhcmQuc291cmNlUGF0aCwgdGhpcy5wbHVnaW4pO1xuICAgICAgICBjb25zdCBhbnN3ZXJDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZmxvd2NhcmRzLWFuc3dlcicsIGF0dHI6IHsgJ3N0eWxlJzogJ2Rpc3BsYXk6IG5vbmU7JyB9IH0pO1xuICAgICAgICBjb25zdCBwcmVBbnN3ZXJCdXR0b25zID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogJ2Zsb3djYXJkcy1idXR0b25zLWNvbnRhaW5lcicgfSk7XG4gICAgICAgIGNvbnN0IHNob3dBbnN3ZXJCdG4gPSBwcmVBbnN3ZXJCdXR0b25zLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdQb2thxbwgb2Rwb3dpZWTFuicgfSk7XG4gICAgICAgIGNvbnN0IHNraXBCdG4gPSBwcmVBbnN3ZXJCdXR0b25zLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdQb21pxYQnLCBjbHM6ICdtb2Qtd2FybmluZycgfSk7XG4gICAgICAgIHNraXBCdG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5jdXJyZW50Q2FyZEluZGV4Kys7IHRoaXMuZGlzcGxheUNhcmQoKTsgfTtcbiAgICAgICAgY29uc3QgcG9zdEFuc3dlckJ1dHRvbnMgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZmxvd2NhcmRzLWJ1dHRvbnMtY29udGFpbmVyJywgYXR0cjogeyAnc3R5bGUnOiAnZGlzcGxheTogbm9uZTsnIH0gfSk7XG4gICAgICAgIHNob3dBbnN3ZXJCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIE1hcmtkb3duUmVuZGVyZXIucmVuZGVyKHRoaXMuYXBwLCBjYXJkLmFuc3dlciwgYW5zd2VyQ29udGFpbmVyLCBjYXJkLnNvdXJjZVBhdGgsIHRoaXMucGx1Z2luKTtcbiAgICAgICAgICAgIGFuc3dlckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJzsgcHJlQW5zd2VyQnV0dG9ucy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnOyBwb3N0QW5zd2VyQnV0dG9ucy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBoYW5kbGVBbnN3ZXIgPSBhc3luYyAocmF0aW5nOiAnYWdhaW4nIHwgJ2hhcmQnIHwgJ29rJyB8ICdlYXN5JykgPT4ge1xuICAgICAgICAgICAgaWYgKHJhdGluZyA9PT0gJ2FnYWluJykgeyB0aGlzLmNhcmRzVG9SZXBlYXQucHVzaChjYXJkKTsgfVxuICAgICAgICAgICAgdGhpcy5wbHVnaW4ucHJvY2Vzc1JldmlldyhjYXJkLmlkLCByYXRpbmcpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50Q2FyZEluZGV4Kys7IHRoaXMuZGlzcGxheUNhcmQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgYWdhaW5CdG4gPSBwb3N0QW5zd2VyQnV0dG9ucy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnQWdhaW4nIH0pOyBhZ2FpbkJ0bi5vbmNsaWNrID0gKCkgPT4gaGFuZGxlQW5zd2VyKCdhZ2FpbicpO1xuICAgICAgICBjb25zdCBoYXJkQnRuID0gcG9zdEFuc3dlckJ1dHRvbnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ0hhcmQnIH0pOyBoYXJkQnRuLm9uY2xpY2sgPSAoKSA9PiBoYW5kbGVBbnN3ZXIoJ2hhcmQnKTtcbiAgICAgICAgY29uc3Qgb2tCdG4gPSBwb3N0QW5zd2VyQnV0dG9ucy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnT2snIH0pOyBva0J0bi5vbmNsaWNrID0gKCkgPT4gaGFuZGxlQW5zd2VyKCdvaycpO1xuICAgICAgICBjb25zdCBlYXN5QnRuID0gcG9zdEFuc3dlckJ1dHRvbnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ0Vhc3knIH0pOyBlYXN5QnRuLm9uY2xpY2sgPSAoKSA9PiBoYW5kbGVBbnN3ZXIoJ2Vhc3knKTtcbiAgICB9XG59XG5cblxuLy8gLS0tIEfFgcOTV05BIEtMQVNBIFBMVUdJTlUgLS0tXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGbG93Q2FyZHNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAgIGRhdGE6IEZsb3dDYXJkc0RhdGE7XG5cbiAgICBhc3luYyBvbmxvYWQoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfFgWFkb3dhbmllIHBsdWdpbnUgRmxvd0NhcmRzLi4uJyk7XG4gICAgICAgIGF3YWl0IHRoaXMubG9hZFBsdWdpbkRhdGEoKTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAndXBkYXRlLWZsYXNoY2FyZHMtaW5kZXgnLFxuICAgICAgICAgICAgbmFtZTogJ0FrdHVhbGl6dWogaW5kZWtzIGZpc3playcsXG4gICAgICAgICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4geyBhd2FpdCB0aGlzLmxvYWRQbHVnaW5EYXRhKCk7IGF3YWl0IHRoaXMucGFyc2VWYXVsdEZvckZsYXNoY2FyZHMoKTsgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ3Jldmlldy1mbGFzaGNhcmRzJyxcbiAgICAgICAgICAgIG5hbWU6ICdVY3ogc2nEmScsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldyBEZWNrU2VsZWN0aW9uTW9kYWwodGhpcy5hcHAsIHRoaXMsIChzZWxlY3RlZERlY2spID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWxsRGVja3MgPSB0aGlzLmdldEFsbERlY2tzKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY2tzVG9SZXZpZXcgPSBzZWxlY3RlZERlY2sgPT09IFwiKiBXc3p5c3RraWUgdGFsaWUgKlwiID8gYWxsRGVja3MgOiBbc2VsZWN0ZWREZWNrXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFydExlYXJuaW5nU2Vzc2lvbihkZWNrc1RvUmV2aWV3KTtcbiAgICAgICAgICAgICAgICB9KS5vcGVuKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnYnJvd3NlLWNhcmRzLWluLWFjdGl2ZS1ub3RlJyxcbiAgICAgICAgICAgIG5hbWU6ICdQcnplZ2zEhWRhaiBmaXN6a2kgdyB0ZWogbm90YXRjZScsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGl2ZUZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgICAgICAgICAgICAgIGlmICghYWN0aXZlRmlsZSkgeyBuZXcgTm90aWNlKFwiT3R3w7NyeiBuYWpwaWVydyBub3RhdGvEmSwga3TDs3LEhSBjaGNlc3ogcHJ6ZWpyemXEhy5cIik7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgIGNvbnN0IGFsbENhcmRzID0gT2JqZWN0LnZhbHVlcyh0aGlzLmRhdGEuY2FyZHMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhcmRzSW5Ob3RlID0gYWxsQ2FyZHMuZmlsdGVyKGNhcmQgPT4gY2FyZC5zb3VyY2VQYXRoID09PSBhY3RpdmVGaWxlLnBhdGgpO1xuICAgICAgICAgICAgICAgIGlmIChjYXJkc0luTm90ZS5sZW5ndGggPiAwKSB7IG5ldyBCcm93c2VyTW9kYWwodGhpcy5hcHAsIHRoaXMsIGNhcmRzSW5Ob3RlKS5vcGVuKCk7IH1cbiAgICAgICAgICAgICAgICBlbHNlIHsgbmV3IE5vdGljZShcIlcgdGVqIG5vdGF0Y2UgbmllIHpuYWxlemlvbm8gxbxhZG55Y2ggZmlzemVrIEZsb3dDYXJkcy5cIik7IH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFzeW5jIG5hdmlnYXRlVG9Tb3VyY2UoY2FyZDogQ2FyZFN0YXRlKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLndvcmtzcGFjZS5vcGVuTGlua1RleHQoY2FyZC5zb3VyY2VQYXRoLCBjYXJkLnNvdXJjZVBhdGgsIGZhbHNlLCB7IGVTdGF0ZTogeyBsaW5lOiBjYXJkLnNvdXJjZUxpbmUgfSB9KTtcbiAgICB9XG5cbiAgICBhc3luYyBsb2FkUGx1Z2luRGF0YSgpIHsgdGhpcy5kYXRhID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9EQVRBLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpOyB9XG4gICAgYXN5bmMgc2F2ZVBsdWdpbkRhdGEoKSB7IGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5kYXRhKTsgfVxuXG4gICAgZ2V0QWxsRGVja3MoKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCBhbGxDYXJkcyA9IE9iamVjdC52YWx1ZXModGhpcy5kYXRhLmNhcmRzKTtcbiAgICAgICAgY29uc3QgZGVja1NldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGNhcmQgb2YgYWxsQ2FyZHMpIHsgZm9yIChjb25zdCBkZWNrIG9mIGNhcmQuZGVja3MpIHsgZGVja1NldC5hZGQoZGVjayk7IH0gfVxuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbShkZWNrU2V0KS5zb3J0KCk7XG4gICAgfVxuXG4gICAgc3RhcnRMZWFybmluZ1Nlc3Npb24oZGVja3M6IHN0cmluZ1tdKSB7XG4gICAgICAgIGNvbnN0IHJldmlld1F1ZXVlID0gdGhpcy5nZXRDYXJkc0ZvclJldmlldyhkZWNrcyk7XG4gICAgICAgIGlmIChyZXZpZXdRdWV1ZS5sZW5ndGggPiAwKSB7IG5ldyBMZWFybmluZ01vZGFsKHRoaXMuYXBwLCB0aGlzLCByZXZpZXdRdWV1ZSkub3BlbigpOyB9XG4gICAgICAgIGVsc2UgeyBuZXcgTm90aWNlKCdCcmFrIGZpc3playBkbyBwb3d0w7Nya2kgdyB3eWJyYW55Y2ggdGFsaWFjaCEnKTsgfVxuICAgIH1cblxuICAgIGdldENhcmRzRm9yUmV2aWV3KGRlY2tzOiBzdHJpbmdbXSk6IENhcmRTdGF0ZVtdIHtcbiAgICAgICAgY29uc3Qgbm93ID0gbW9tZW50KCk7XG4gICAgICAgIGNvbnN0IGFsbENhcmRzID0gT2JqZWN0LnZhbHVlcyh0aGlzLmRhdGEuY2FyZHMpO1xuICAgICAgICByZXR1cm4gYWxsQ2FyZHMuZmlsdGVyKGNhcmQgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5TZWxlY3RlZERlY2sgPSBjYXJkLmRlY2tzLnNvbWUoZCA9PiBkZWNrcy5pbmNsdWRlcyhkKSk7XG4gICAgICAgICAgICBpZiAoIWluU2VsZWN0ZWREZWNrKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICBpZiAoY2FyZC5zdGF0dXMgPT09ICduZXcnKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChjYXJkLmR1ZURhdGUgJiYgbW9tZW50KGNhcmQuZHVlRGF0ZSkuaXNTYW1lT3JCZWZvcmUobm93KSkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcm9jZXNzUmV2aWV3KGNhcmRJZDogc3RyaW5nLCByYXRpbmc6ICdhZ2FpbicgfCAnaGFyZCcgfCAnb2snIHwgJ2Vhc3knKSB7XG4gICAgICAgIGNvbnN0IGNhcmQgPSB0aGlzLmRhdGEuY2FyZHNbY2FyZElkXTtcbiAgICAgICAgaWYgKCFjYXJkKSByZXR1cm47IGxldCBuZXdJbnRlcnZhbDsgY29uc3Qgb2xkU3RhdHVzID0gY2FyZC5zdGF0dXM7XG4gICAgICAgIGlmIChyYXRpbmcgPT09ICdhZ2FpbicpIHtcbiAgICAgICAgICAgIGNhcmQuaW50ZXJ2YWwgPSAwOyBjYXJkLnN0YXR1cyA9ICdsZWFybmluZyc7IG5ld0ludGVydmFsID0gMSAvICgyNCAqIDYwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChvbGRTdGF0dXMgPT09ICduZXcnIHx8IG9sZFN0YXR1cyA9PT0gJ2xlYXJuaW5nJykge1xuICAgICAgICAgICAgICAgIG5ld0ludGVydmFsID0gcmF0aW5nID09PSAnaGFyZCcgPyAxIDogcmF0aW5nID09PSAnb2snID8gMyA6IDU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld0ludGVydmFsID0gcmF0aW5nID09PSAnaGFyZCcgPyBjYXJkLmludGVydmFsICogMS4yIDogcmF0aW5nID09PSAnb2snID8gY2FyZC5pbnRlcnZhbCAqIGNhcmQuZWFzZUZhY3RvciA6IGNhcmQuaW50ZXJ2YWwgKiBjYXJkLmVhc2VGYWN0b3IgKiAxLjM7XG4gICAgICAgICAgICAgICAgaWYgKHJhdGluZyA9PT0gJ2hhcmQnKSBjYXJkLmVhc2VGYWN0b3IgPSBNYXRoLm1heCgxLjMsIGNhcmQuZWFzZUZhY3RvciAtIDAuMTUpO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHJhdGluZyA9PT0gJ2Vhc3knKSBjYXJkLmVhc2VGYWN0b3IgKz0gMC4xNTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhcmQuaW50ZXJ2YWwgPSBuZXdJbnRlcnZhbDsgY2FyZC5zdGF0dXMgPSAncmV2aWV3JztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkdWVEYXRlID0gbW9tZW50KCkuYWRkKG5ld0ludGVydmFsLCAnZGF5cycpO1xuICAgICAgICBjYXJkLmR1ZURhdGUgPSBkdWVEYXRlLmZvcm1hdCgpOyB0aGlzLnNhdmVQbHVnaW5EYXRhKCk7XG4gICAgfVxuXG4gICAgLy8gLS0tIEtMVUNaT1dFIFpNSUFOWSBUVVRBSiAtLS1cbiAgICBhc3luYyBwYXJzZVZhdWx0Rm9yRmxhc2hjYXJkcygpIHtcbiAgICAgICAgY29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XG4gICAgICAgIGNvbnN0IGNhcmRzSW5WYXVsdDogUmVjb3JkPHN0cmluZywgQ2FyZFN0YXRlPiA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVDb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbiAgICAgICAgICAgIGxldCBmaWxlQ29udGVudExpbmVzID0gZmlsZUNvbnRlbnQuc3BsaXQoJ1xcbicpO1xuICAgICAgICAgICAgbGV0IGZpbGVNb2RpZmllZCA9IGZhbHNlO1xuICAgICAgICAgICAgY29uc3QgcmF3Q2FyZHMgPSB0aGlzLmZpbmRSYXdDYXJkcyhmaWxlQ29udGVudExpbmVzKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSByYXdDYXJkcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJhd0NhcmQgPSByYXdDYXJkc1tpXTtcbiAgICAgICAgICAgICAgICBsZXQgY2FyZElkID0gcmF3Q2FyZC5pZDtcbiAgICAgICAgICAgICAgICBpZiAoIWNhcmRJZCkge1xuICAgICAgICAgICAgICAgICAgICBjYXJkSWQgPSBgZmMtJHtEYXRlLm5vdygpfSR7aX1gO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaW5lVG9Nb2RpZnkgPSBmaWxlQ29udGVudExpbmVzW3Jhd0NhcmQuc2VwYXJhdG9yTGluZV07XG4gICAgICAgICAgICAgICAgICAgIGZpbGVDb250ZW50TGluZXNbcmF3Q2FyZC5zZXBhcmF0b3JMaW5lXSA9IGAke2xpbmVUb01vZGlmeS50cmltRW5kKCl9IEBAJHtjYXJkSWR9YDtcbiAgICAgICAgICAgICAgICAgICAgZmlsZU1vZGlmaWVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YS5jYXJkc1tjYXJkSWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0YS5jYXJkc1tjYXJkSWRdLnF1ZXN0aW9uID0gcmF3Q2FyZC5xdWVzdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhLmNhcmRzW2NhcmRJZF0uYW5zd2VyID0gcmF3Q2FyZC5hbnN3ZXI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0YS5jYXJkc1tjYXJkSWRdLmRlY2tzID0gcmF3Q2FyZC5kZWNrcztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhLmNhcmRzW2NhcmRJZF0uc291cmNlUGF0aCA9IGZpbGUucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhLmNhcmRzW2NhcmRJZF0uc291cmNlTGluZSA9IHJhd0NhcmQuc2VwYXJhdG9yTGluZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGEuY2FyZHNbY2FyZElkXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBjYXJkSWQsIHF1ZXN0aW9uOiByYXdDYXJkLnF1ZXN0aW9uLCBhbnN3ZXI6IHJhd0NhcmQuYW5zd2VyLCBkZWNrczogcmF3Q2FyZC5kZWNrcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZVBhdGg6IGZpbGUucGF0aCwgc291cmNlTGluZTogcmF3Q2FyZC5zZXBhcmF0b3JMaW5lLCBzdGF0dXM6ICduZXcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVlRGF0ZTogbnVsbCwgaW50ZXJ2YWw6IDAsIGVhc2VGYWN0b3I6IDIuNVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXJkc0luVmF1bHRbY2FyZElkXSA9IHRoaXMuZGF0YS5jYXJkc1tjYXJkSWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZpbGVNb2RpZmllZCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCBmaWxlQ29udGVudExpbmVzLmpvaW4oJ1xcbicpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGlkIGluIHRoaXMuZGF0YS5jYXJkcykgeyBpZiAoIWNhcmRzSW5WYXVsdFtpZF0pIHsgZGVsZXRlIHRoaXMuZGF0YS5jYXJkc1tpZF07IH0gfVxuICAgICAgICBuZXcgTm90aWNlKGBJbmRla3MgemFrdHVhbGl6b3dhbnkuIMWabGVkem9ueWNoIGZpc3plazogJHtPYmplY3Qua2V5cyh0aGlzLmRhdGEuY2FyZHMpLmxlbmd0aH1gKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlUGx1Z2luRGF0YSgpO1xuICAgIH1cblxuICAgIGZpbmRSYXdDYXJkcyhsaW5lczogc3RyaW5nW10pOiB7IHF1ZXN0aW9uOiBzdHJpbmcsIGFuc3dlcjogc3RyaW5nLCBkZWNrczogc3RyaW5nW10sIGlkOiBzdHJpbmcgfCBudWxsLCBzZXBhcmF0b3JMaW5lOiBudW1iZXIgfVtdIHtcbiAgICAgICAgY29uc3QgZm91bmRDYXJkcyA9IFtdO1xuICAgICAgICBjb25zdCBzZXBhcmF0b3JSZWdleCA9IC9eXFw/XFxzKigoPzojZGVja1xcL1xcUytcXHMqKSspKD86XFxzKkBAKFxcUyspKT8vOyAvLyBOT1dZIFJFR0VYXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltRW5kKCk7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goc2VwYXJhdG9yUmVnZXgpO1xuICAgICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcXVlc3Rpb25MaW5lcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSBpIC0gMTsgaiA+PSAwOyBqLS0pIHsgaWYgKGxpbmVzW2pdLnRyaW0oKSA9PT0gJycpIGJyZWFrOyBxdWVzdGlvbkxpbmVzLnVuc2hpZnQobGluZXNbal0pOyB9XG4gICAgICAgICAgICAgICAgY29uc3QgYW5zd2VyTGluZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCBsaW5lcy5sZW5ndGg7IGorKykgeyBpZiAobGluZXNbal0udHJpbSgpID09PSAnJykgYnJlYWs7IGFuc3dlckxpbmVzLnB1c2gobGluZXNbal0pOyB9XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXN0aW9uTGluZXMubGVuZ3RoID4gMCAmJiBhbnN3ZXJMaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhZ1N0cmluZyA9IG1hdGNoWzFdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXJkSWQgPSBtYXRjaFsyXSB8fCBudWxsOyAvLyBHcnVwYSAyIHRvIHRlcmF6IG5hc3plIElEXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY2tzID0gdGFnU3RyaW5nLnRyaW0oKS5zcGxpdCgvXFxzKy8pLm1hcCh0YWcgPT4gdGFnLnN1YnN0cmluZygxKSk7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kQ2FyZHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVzdGlvbjogcXVlc3Rpb25MaW5lcy5qb2luKCdcXG4nKSwgYW5zd2VyOiBhbnN3ZXJMaW5lcy5qb2luKCdcXG4nKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlY2tzOiBkZWNrcywgaWQ6IGNhcmRJZCwgc2VwYXJhdG9yTGluZTogaVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvdW5kQ2FyZHM7XG4gICAgfVxufVxuIl19