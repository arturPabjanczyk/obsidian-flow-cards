import { App, Plugin, Notice, TFile, Modal, MarkdownRenderer, FuzzySuggestModal } from 'obsidian';
import { moment } from 'obsidian';

// --- INTERFEJSY I TYPY ---
type CardStatus = 'new' | 'learning' | 'review';
interface CardState {
    id: string; question: string; answer: string; decks: string[]; sourcePath: string; sourceLine: number;
    status: CardStatus; dueDate: string | null; interval: number; easeFactor: number;
}
interface FlowCardsData { cards: Record<string, CardState>; }
const DEFAULT_DATA: FlowCardsData = { cards: {}, };

// --- WSZYSTKIE KLASY MODALI (bez zmian, skrócone dla czytelności) ---
class DeckSelectionModal extends FuzzySuggestModal<string> {
    private plugin: FlowCardsPlugin;
    private allDecks: string[];
    private onChoose: (selectedDeck: string) => void;
    private stats: Record<string, { new: number, due: number }>;

    constructor(app: App, plugin: FlowCardsPlugin, stats: Record<string, { new: number, due: number }>, onChoose: (selectedDeck: string) => void) {
        super(app); 
        this.plugin = plugin;
        this.allDecks = this.plugin.getAllDecks();
        this.onChoose = onChoose;
        this.stats = stats; // ZMIANA: Przechowujemy statystyki
        this.setPlaceholder("Wybierz talię do nauki...");
    }

    // ZMIANA: Modyfikujemy listę, aby zawierała statystyki
    getItems(): string[] { 
        const allDecksFormatted = this.allDecks.map(deck => {
            const deckStats = this.stats[deck] || { new: 0, due: 0 };
            return `${deck} (Nowe: ${deckStats.new}, Do powtórki: ${deckStats.due})`;
        });

        const totalStats = this.stats["* Wszystkie talie *"] || { new: 0, due: 0 };
        const allTaliesFormatted = `* Wszystkie talie * (Nowe: ${totalStats.new}, Do powtórki: ${totalStats.due})`;
        
        return [allTaliesFormatted, ...allDecksFormatted];
    }

    getItemText(item: string): string { 
        return item; 
    }

    // ZMIANA: Musimy wyciągnąć oryginalną nazwę talii z formatowanego tekstu
    onChooseItem(selectedItem: string, evt: MouseEvent | KeyboardEvent): void { 
        // Wyciągamy nazwę talii, która jest pierwszym słowem
        const deckName = selectedItem.split(' (')[0];
        this.onChoose(deckName);
    }
}
class BrowserModal extends Modal {
    private plugin: FlowCardsPlugin; private cards: CardState[]; private currentCardIndex: number = 0;
    constructor(app: App, plugin: FlowCardsPlugin, cards: CardState[]) {
        super(app); this.plugin = plugin; this.cards = cards.sort((a, b) => a.sourceLine - b.sourceLine);
    }
    onOpen() { this.displayCard(); }
    onClose() { this.contentEl.empty(); }
    displayCard() {
        this.contentEl.empty();
        const card = this.cards[this.currentCardIndex];
        if (!card) { this.close(); return; }
        const container = this.contentEl.createDiv({ cls: 'flowcards-browser-container' });
        const navHeader = container.createDiv({ cls: 'flowcards-browser-nav' });
        const prevBtn = navHeader.createEl('button', { text: '<< Poprzednia' });
        navHeader.createSpan({ text: `Karta ${this.currentCardIndex + 1} z ${this.cards.length}` });
        const nextBtn = navHeader.createEl('button', { text: 'Następna >>' });
        prevBtn.disabled = this.currentCardIndex === 0;
        nextBtn.disabled = this.currentCardIndex === this.cards.length - 1;
        prevBtn.onclick = () => { this.currentCardIndex--; this.displayCard(); };
        nextBtn.onclick = () => { this.currentCardIndex++; this.displayCard(); };
        const sourceLinkContainer = container.createDiv({ cls: 'flowcards-source-link-container' })
        const sourceLink = sourceLinkContainer.createEl('a', { text: `Źródło: ${card.sourcePath}`, cls: 'flowcards-source-link' });
        sourceLink.onclick = () => { this.close(); this.plugin.navigateToSource(card); };
        container.createEl('h3', { text: 'Pytanie' });
        const questionEl = container.createDiv({ cls: 'flowcards-browser-content' });
        MarkdownRenderer.render(this.app, card.question, questionEl, card.sourcePath, this.plugin);
        container.createEl('h3', { text: 'Odpowiedź' });
        const answerEl = container.createDiv({ cls: 'flowcards-browser-content' });
        MarkdownRenderer.render(this.app, card.answer, answerEl, card.sourcePath, this.plugin);
    }
}
class LearningModal extends Modal {
    private plugin: FlowCardsPlugin; private reviewQueue: CardState[]; private currentCardIndex: number = 0; private cardsToRepeat: CardState[] = [];
    constructor(app: App, plugin: FlowCardsPlugin, reviewQueue: CardState[]) {
        super(app); this.plugin = plugin; this.reviewQueue = this.shuffleArray(reviewQueue);
    }
    onOpen() { this.displayCard(); }
    onClose() { this.contentEl.empty(); }
    private shuffleArray(array: any[]): any[] {
        for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; }
        return array;
    }
    displayCard() {
        this.contentEl.empty();
        const card = this.reviewQueue[this.currentCardIndex];
        if (!card) {
            if (this.cardsToRepeat.length > 0) {
                this.reviewQueue = this.shuffleArray(this.cardsToRepeat); this.cardsToRepeat = []; this.currentCardIndex = 0; this.displayCard();
            } else { new Notice('Sesja nauki zakończona!'); this.close(); }
            return;
        }
        const container = this.contentEl.createDiv({ cls: 'flowcards-container' });
        const sourceLinkContainer = container.createDiv({ cls: 'flowcards-source-link-container flowcards-source-link-learning' });
        const sourceLink = sourceLinkContainer.createEl('a', { text: 'Przejdź do źródła', cls: 'flowcards-source-link' });
        sourceLink.onclick = () => { this.close(); this.plugin.navigateToSource(card); };
        const questionEl = container.createDiv({ cls: 'flowcards-question' });
        MarkdownRenderer.render(this.app, card.question, questionEl, card.sourcePath, this.plugin);
        const answerContainer = container.createDiv({ cls: 'flowcards-answer', attr: { 'style': 'display: none;' } });
        const preAnswerButtons = container.createDiv({ cls: 'flowcards-buttons-container' });
        const showAnswerBtn = preAnswerButtons.createEl('button', { text: 'Pokaż odpowiedź' });
        const skipBtn = preAnswerButtons.createEl('button', { text: 'Pomiń', cls: 'mod-warning' });
        skipBtn.onclick = () => { this.currentCardIndex++; this.displayCard(); };
        const postAnswerButtons = container.createDiv({ cls: 'flowcards-buttons-container', attr: { 'style': 'display: none;' } });
        showAnswerBtn.onclick = () => {
            MarkdownRenderer.render(this.app, card.answer, answerContainer, card.sourcePath, this.plugin);
            answerContainer.style.display = 'block'; preAnswerButtons.style.display = 'none'; postAnswerButtons.style.display = 'flex';
        };
        const handleAnswer = async (rating: 'again' | 'hard' | 'ok' | 'easy') => {
            if (rating === 'again') { this.cardsToRepeat.push(card); }
            this.plugin.processReview(card.id, rating);
            this.currentCardIndex++; this.displayCard();
        };
        const againBtn = postAnswerButtons.createEl('button', { text: 'Again' }); againBtn.onclick = () => handleAnswer('again');
        const hardBtn = postAnswerButtons.createEl('button', { text: 'Hard' }); hardBtn.onclick = () => handleAnswer('hard');
        const okBtn = postAnswerButtons.createEl('button', { text: 'Ok' }); okBtn.onclick = () => handleAnswer('ok');
        const easyBtn = postAnswerButtons.createEl('button', { text: 'Easy' }); easyBtn.onclick = () => handleAnswer('easy');
    }
}


// --- GŁÓWNA KLASA PLUGINU ---
export default class FlowCardsPlugin extends Plugin {
    data: FlowCardsData;

    async onload() {
        console.log('Ładowanie pluginu FlowCards...');
        await this.loadPluginData();
        this.addCommand({
            id: 'update-flashcards-index',
            name: 'Aktualizuj indeks fiszek',
            callback: async () => { await this.loadPluginData(); await this.parseVaultForFlashcards(); },
        });
        this.addCommand({
            id: 'review-flashcards',
            name: 'Ucz się',
            callback: () => {
                // ZMIANA: Najpierw obliczamy statystyki
                const stats = this.getDeckStats();
                new DeckSelectionModal(this.app, this, stats, (selectedDeck) => {
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
                if (!activeFile) { new Notice("Otwórz najpierw notatkę, którą chcesz przejrzeć."); return; }
                const allCards = Object.values(this.data.cards);
                const cardsInNote = allCards.filter(card => card.sourcePath === activeFile.path);
                if (cardsInNote.length > 0) { new BrowserModal(this.app, this, cardsInNote).open(); }
                else { new Notice("W tej notatce nie znaleziono żadnych fiszek FlowCards."); }
            },
        });
    }

    // NOWA FUNKCJA do obliczania statystyk
    getDeckStats(): Record<string, { new: number, due: number }> {
        const now = moment();
        const allCards = Object.values(this.data.cards);
        const stats: Record<string, { new: number, due: number }> = {};
        const totalStats = { new: 0, due: 0 };

        // Inicjalizacja statystyk dla wszystkich istniejących talii
        this.getAllDecks().forEach(deck => {
            stats[deck] = { new: 0, due: 0 };
        });

        for (const card of allCards) {
            let isDue = false;
            let isNew = false;

            if (card.status === 'new') {
                isNew = true;
                totalStats.new++;
            } else if (card.dueDate && moment(card.dueDate).isSameOrBefore(now)) {
                isDue = true;
                totalStats.due++;
            }

            if (isNew || isDue) {
                for (const deck of card.decks) {
                    if (stats[deck]) {
                        if (isNew) stats[deck].new++;
                        if (isDue) stats[deck].due++;
                    }
                }
            }
        }
        stats["* Wszystkie talie *"] = totalStats;
        return stats;
    }
    
    async navigateToSource(card: CardState) {
        await this.app.workspace.openLinkText(card.sourcePath, card.sourcePath, false, { eState: { line: card.sourceLine } });
    }

    async loadPluginData() { this.data = Object.assign({}, DEFAULT_DATA, await this.loadData()); }
    async savePluginData() { await this.saveData(this.data); }

    getAllDecks(): string[] {
        const allCards = Object.values(this.data.cards);
        const deckSet = new Set<string>();
        for (const card of allCards) { for (const deck of card.decks) { deckSet.add(deck); } }
        return Array.from(deckSet).sort();
    }

    startLearningSession(decks: string[]) {
        const reviewQueue = this.getCardsForReview(decks);
        if (reviewQueue.length > 0) { new LearningModal(this.app, this, reviewQueue).open(); }
        else { new Notice('Brak fiszek do powtórki w wybranych taliach!'); }
    }

    getCardsForReview(decks: string[]): CardState[] {
        const now = moment();
        const allCards = Object.values(this.data.cards);
        return allCards.filter(card => {
            const inSelectedDeck = card.decks.some(d => decks.includes(d));
            if (!inSelectedDeck) return false;
            if (card.status === 'new') return true;
            if (card.dueDate && moment(card.dueDate).isSameOrBefore(now)) { return true; }
            return false;
        });
    }

    processReview(cardId: string, rating: 'again' | 'hard' | 'ok' | 'easy') {
        const card = this.data.cards[cardId];
        if (!card) return; let newInterval; const oldStatus = card.status;
        if (rating === 'again') {
            card.interval = 0; card.status = 'learning'; newInterval = 1 / (24 * 60);
        } else {
            if (oldStatus === 'new' || oldStatus === 'learning') {
                newInterval = rating === 'hard' ? 1 : rating === 'ok' ? 3 : 5;
            } else {
                newInterval = rating === 'hard' ? card.interval * 1.2 : rating === 'ok' ? card.interval * card.easeFactor : card.interval * card.easeFactor * 1.3;
                if (rating === 'hard') card.easeFactor = Math.max(1.3, card.easeFactor - 0.15);
                else if (rating === 'easy') card.easeFactor += 0.15;
            }
            card.interval = newInterval; card.status = 'review';
        }
        const dueDate = moment().add(newInterval, 'days');
        card.dueDate = dueDate.format(); this.savePluginData();
    }

    async parseVaultForFlashcards() {
        const files = this.app.vault.getMarkdownFiles();
        const cardsInVault: Record<string, CardState> = {};
        for (const file of files) {
            const fileContent = await this.app.vault.cachedRead(file);
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
                } else {
                    this.data.cards[cardId] = {
                        id: cardId, question: rawCard.question, answer: rawCard.answer, decks: rawCard.decks,
                        sourcePath: file.path, sourceLine: rawCard.separatorLine, status: 'new',
                        dueDate: null, interval: 0, easeFactor: 2.5
                    };
                }
                cardsInVault[cardId] = this.data.cards[cardId];
            }
            if (fileModified) {
                await this.app.vault.modify(file, fileContentLines.join('\n'));
            }
        }
        for (const id in this.data.cards) { if (!cardsInVault[id]) { delete this.data.cards[id]; } }
        new Notice(`Indeks zaktualizowany. Śledzonych fiszek: ${Object.keys(this.data.cards).length}`);
        await this.savePluginData();
    }

    findRawCards(lines: string[]): { question: string, answer: string, decks: string[], id: string | null, separatorLine: number }[] {
        const foundCards = [];
        const separatorRegex = /^\?\s*((?:#deck\/\S+\s*)+)(?:\s*@@(\S+))?/; // NOWY REGEX
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trimEnd();
            const match = line.match(separatorRegex);
            if (match) {
                const questionLines = [];
                for (let j = i - 1; j >= 0; j--) { if (lines[j].trim() === '') break; questionLines.unshift(lines[j]); }
                const answerLines = [];
                for (let j = i + 1; j < lines.length; j++) { if (lines[j].trim() === '') break; answerLines.push(lines[j]); }
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
