// Bithir's Symbaroum Mods integration for Symbaroum Ind Resources
// Adapted for modern ES Modules (V11/V12/V13 compatible)

const moduleId = 'symbaroum-ind-resources';
const i18nPath = 'BITHIRMOD.';
const basePath = `modules/${moduleId}`;
const assetPath = `${basePath}/assets`;
const templatePath = `${basePath}/templates`;
const BaseDie = globalThis.foundry?.dice?.terms?.Die ?? globalThis.Die;
const translationMigrationVersion = 2;

const folderNameMigrations = {
    'Ind Resouces - Utilidades': 'Ind Resources - Utilidades',
    'Equipmentos': 'Equipamentos'
};

const tableNameMigrations = {
    'Forest Events': 'Eventos na Floresta',
    'Forest Events - Horror': 'Eventos na Floresta - Horror',
    'Forest Events - Mundane': 'Eventos na Floresta - Mundano',
    'Forest Events - Mystical / Inspiring': 'Eventos na Floresta - Místico / Inspirador',
    'Eventos na Floresta - Mistico / Inspirador': 'Eventos na Floresta - Místico / Inspirador',
    'Forest Events - On the path': 'Eventos na Floresta - Na trilha',
    'armadura corrompida': 'corrupt-armor',
    'corrupt-armorname': 'corrupt-armor-name',
    'nome-da-armadura-corrompida': 'corrupt-armor-name',
    'arma corrompida': 'corrupt-weapon',
    'corrupt-weaponname': 'corrupt-weapon-name',
    'nome-de-arma-corrompida': 'corrupt-weapon-name'
};

const tableResultTextMigrations = {
    'Forest Events - Horror': 'Eventos na Floresta - Horror',
    'Forest Events - Mundane': 'Eventos na Floresta - Mundano',
    'Forest Events - Mystical / Inspiring': 'Eventos na Floresta - Místico / Inspirador',
    'Eventos na Floresta - Mistico / Inspirador': 'Eventos na Floresta - Místico / Inspirador',
    'Forest Events - On the path': 'Eventos na Floresta - Na trilha',
    'Nothing of interest': 'Nada de interessante'
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
export const BithirConfig = {
    moduleId,
    basePath,
    assetPath,
    templatePath,
    i18nPath,
    expCost: (level) => level * (level + 1) / 2 * 10,
    randomElement: (list) => Array.isArray(list) ? list[Math.floor(Math.random() * list.length)] : null,
    shadowTypes: ["corrupt", "civilised", "natural"],
    resistanceLevels: [
        { name: "Weak", experience: 0, abilities: "1" },
        { name: "Ordinary", experience: 50, abilities: "1d3" },
        { name: "Challenging", experience: 150, abilities: "1d3" },
        { name: "Strong", experience: 300, abilities: "1d3" },
        { name: "Mighty", experience: 600, abilities: "1d3" },
        { name: "Legendary", experience: 1200, abilities: "1d3" }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
export class BithirApi {
    localize(key) {
        return game.i18n.localize(`${i18nPath}${key}`);
    }

    localizeFallback(key, fallback) {
        const localized = this.localize(key);
        return localized === `${i18nPath}${key}` ? fallback : localized;
    }

    localizeVerseTitle(title) {
        const key = title
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .toUpperCase();
        return this.localizeFallback(`VERSE_${key}`, title);
    }

    async replaceAsync(string, regex, replacerFunction) {
        const promises = [];
        string.replace(regex, (match, ...args) => {
            const promise = replacerFunction(match, ...args);
            promises.push(promise);
        });
        const data = await Promise.all(promises);
        return string.replace(regex, () => data.shift());
    }

    async generateShadow(type, actor) {
        if (!BithirConfig.shadowTypes.includes(type)) {
            console.error(`Trying to generate a shadow for a type that does not exist - type[${type}]`);
            return;
        }
        
        let attributes = {
            primaryattribute: BithirConfig.randomElement(game.symbaroum.config.attributes),
            secondaryattribute: BithirConfig.randomElement(game.symbaroum.config.attributes)
        };

        if (actor) {
            let attribs = foundry.utils.duplicate(game.symbaroum.config.attributes);
            attribs.sort((a, b) => {
                return (actor.system.attributes[a]?.total ?? actor.system.attributes[a]?.value ?? 0) - 
                       (actor.system.attributes[b]?.total ?? actor.system.attributes[b]?.value ?? 0);
            });
            attributes.primaryattribute = attribs.pop();
            if (Math.floor(Math.random() * 2) === 0) {
                attribs.pop(); // select second strongest attribute instead of first
            }
            attributes.secondaryattribute = attribs.pop();
        }
        
        return await this.parseSimpleElement(type, attributes, `{#${type}-base}`);
    }

    async parseSimpleElement(type, attributes, str) {
        let newStr = await this.replaceAsync(str, /\{[#$][^\}]+\}/g, async (all) => {            
            all = all.replace(/[\{\}]/g, '');
            let table = null;
            if (all.charAt(0) === '$') {
                table = game.tables.find(f => f.name.match(new RegExp(`${type}.*-${attributes[all.slice(1)]}`, 'i')));
            }
            if (all.charAt(0) === '#') {
                table = game.tables.getName(all.slice(1));
            }
            if (!table) {
                console.error(`Found no matching table ${all} for str ${str}`);
                return "";
            }
            const rollResult = await table.roll();
            return rollResult.results[0]?.text ?? rollResult.results[0]?.description ?? rollResult.results[0]?.name ?? "";
        });
        if (newStr === str) return newStr;
        return await this.parseSimpleElement(type, attributes, newStr);
    }
}

const api = new BithirApi();

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM DICE TERMS
// ─────────────────────────────────────────────────────────────────────────────
export class InspirationDie extends BaseDie {
    constructor(termData) {
        termData.faces = 6;
        super(termData);
    }

    roll({ minimize = false, maximize = false } = {}) {
        const roll = { result: undefined, active: true };
        roll.result = Math.ceil((CONFIG.Dice.randomUniform() * this.faces));
        roll.tooltip = game.i18n.localize(`${i18nPath}inspiration_tooltip_${this.denomination}${roll.result}`);
        this.results.push(roll);
        return roll;
    }

    getResultCSS(result) {
        return [
            "inspirationdie",
            this.constructor.name.toLowerCase()
        ];
    }

    get denomination() { return InspirationDie.DENOMINATION; }
    static DENOMINATION = "i";
    static MODIFIERS = {};

    get total() {
        return this.results.length;
    }

    getResultLabel(result) {
        return `<img src="${assetPath}/inspirationdice/i${this.denomination}d${result.result}.png" data-tooltip="${result.tooltip}"/>`;
    }
}

export class LocationDie extends InspirationDie {
    static DENOMINATION = "l";
    get denomination() { return LocationDie.DENOMINATION; }

    static get diceSoNiceColorset() {
        return {
            name: 'LocationDice',
            description: 'LocationDice',
            category: 'Symbaroum',
            foreground: '#000000',
            background: '#b9fb9d',
            outline: '#268a19',
            texture: 'cloudy_2',
            edge: '#438e44',
        };
    }

    static get diceSoNiceDicePreset() { 
        return {
            type: `d${LocationDie.DENOMINATION}`,
            labels: [
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d1d.png`, 
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d2d.png`, 
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d3d.png`, 
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d4d.png`, 
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d5d.png`, 
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d6d.png`
            ],
            bumpMaps: [
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d1b.png`, 
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d2b.png`, 
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d3b.png`, 
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d4b.png`, 
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d5b.png`, 
                `${assetPath}/inspirationdice/i${LocationDie.DENOMINATION}d6b.png`
            ],
            colorset: "LocationDice",
            system: "symbaroum"
        };
    }
}

export class EventDie extends InspirationDie {
    static DENOMINATION = "e";
    get denomination() { return EventDie.DENOMINATION; }

    static get diceSoNiceColorset() {
        return {
            name: 'EventDice',
            description: 'EventDice',
            category: 'Symbaroum',
            foreground: '#000000',
            background: '#f5adff',
            outline: '#e27af0',
            texture: 'paper',
            edge: '#d052e0',
        };
    }

    static get diceSoNiceDicePreset() { 
        return {
            type: `d${EventDie.DENOMINATION}`,
            labels: [
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d1d.png`, 
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d2d.png`, 
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d3d.png`, 
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d4d.png`, 
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d5d.png`, 
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d6d.png`
            ],
            bumpMaps: [
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d1b.png`, 
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d2b.png`, 
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d3b.png`, 
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d4b.png`, 
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d5b.png`, 
                `${assetPath}/inspirationdice/i${EventDie.DENOMINATION}d6b.png`
            ],
            colorset: "EventDice",
            system: "symbaroum"
        };
    }
}

export class CreatureDie extends InspirationDie {
    static DENOMINATION = "c";
    get denomination() { return CreatureDie.DENOMINATION; }

    static get diceSoNiceColorset() {
        return {
            name: 'CreatureDice',
            description: 'CreatureDice',
            category: 'Symbaroum',
            foreground: '#ffffff',
            background: '#830101',
            outline: '#f20707',
            texture: 'cloudy_2',
            edge: '#6a0101',
        };
    }

    static get diceSoNiceDicePreset() { 
        return {
            type: `d${CreatureDie.DENOMINATION}`,
            labels: [
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d1d.png`, 
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d2d.png`, 
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d3d.png`, 
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d4d.png`, 
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d5d.png`, 
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d6d.png`
            ],
            bumpMaps: [
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d1b.png`, 
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d2b.png`, 
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d3b.png`, 
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d4b.png`, 
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d5b.png`, 
                `${assetPath}/inspirationdice/i${CreatureDie.DENOMINATION}d6b.png`
            ],
            colorset: "CreatureDice",
            system: "symbaroum"
        };
    }
}

export class RewardDie extends InspirationDie {
    static DENOMINATION = "r";
    get denomination() { return RewardDie.DENOMINATION; }

    static get diceSoNiceColorset() {
        return {
            name: 'RewardDice',
            description: 'RewardDice',
            category: 'Symbaroum',
            foreground: '#000000',
            background: '#ffd500',
            outline: '#d39c03',
            texture: 'paper',
            edge: '#fdc77c',
        };
    }

    static get diceSoNiceDicePreset() { 
        return {
            type: `d${RewardDie.DENOMINATION}`,
            labels: [
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d1d.png`, 
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d2d.png`, 
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d3d.png`, 
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d4d.png`, 
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d5d.png`, 
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d6d.png`
            ],
            bumpMaps: [
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d1b.png`, 
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d2b.png`, 
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d3b.png`, 
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d4b.png`, 
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d5b.png`, 
                `${assetPath}/inspirationdice/i${RewardDie.DENOMINATION}d6b.png`
            ],
            colorset: "RewardDice",
            system: "symbaroum"
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MACRO SERVICES
// ─────────────────────────────────────────────────────────────────────────────
export class BithirMacros {
    async thusSpoke() {
        let data = await foundry.utils.fetchJsonWithTimeout(`${basePath}/data/aroaleta-verses.json`);
        const keys = Object.keys(data);
        const selectedKey = BithirConfig.randomElement(keys);
        const aroaletaText = BithirConfig.randomElement(data[selectedKey]);
        let template = `<blockquote style="border-left:0px" class="symbaroum-mod fancytextright">
            <div style="display: flex;align-items: center;justify-content: center;"><span style="display:flex" class="symbaroum-mod fancyheader">&nbsp;</span></div>
            <span class="symbaroum-mod"><h5 data-anchor="thus-spoke-aroaleta">${api.localize('VERSES_HEADER')}</h5></span>
            <p class="symbaroum-mod fancytext">
                “${aroaletaText}”
            </p>
            <p class="symbaroum-mod fancytext">${api.localizeVerseTitle(selectedKey)}</p>
            <div style="display: flex;align-items: center;justify-content: center;"><span style="display:flex" class="symbaroum-mod fancyheader">&nbsp;</span></div>
        </blockquote>`;
        
        ChatMessage.create({
            speaker: { alias: "Aroaleta" },
            content: template
        });
    }

    async generateNPCMacro() {
        const generatorFileRegex = /.*\/(.*)-generator.json/;
        let generatorList = '';
        const { files } = await foundry.applications.apps.FilePicker.browse("data", `${basePath}/data/`);
        for (let i = 0; i < files.length; i++) {
            let mymatch = files[i].match(generatorFileRegex);
            if (mymatch == null) { continue; }
            generatorList += `<option value="${mymatch[1]}">${api.localizeFallback(`GENERATOR_${mymatch[1]}`, mymatch[1])}</option>`;
        }
        
        let expLevel = '';
        for (let resistLv of BithirConfig.resistanceLevels) {
            expLevel += `<option value="${resistLv.name}">${api.localizeFallback(`RESISTANCE_${resistLv.name.toUpperCase()}`, resistLv.name)}</option>`;
        }
        
        let dialog_content = `  
        <div class="form-group">
            <h2>${api.localize('GENERATOR_SELECTGENERATORTYPE')}</h2>
            <br />
            <div style="flex-basis: auto;flex-direction: row;display: flex;">
                <div class="dialogEntry"><select id="generator" name="generator">${generatorList}</select></div>
            </div><br/>
            <h2>${api.localize('GENERATOR_SELECTRESISTANCELEVEL')}</h2>
            <br />
            <div style="flex-basis: auto;flex-direction: row;display: flex;">
                <div class="dialogEntry"><select id="expLevel" name="expLevel">${expLevel}</select></div>
            </div>
            <br/>        
        </div>`;
        
        const x = new Dialog({
            content: dialog_content,
            buttons: {
                Ok: { 
                    label: api.localize(`OK`), 
                    callback: async (html) => {
                        const generatorConfigName = html.find('#generator')[0].value;
                        const expLevelName = html.find('#expLevel')[0].value;
                        const selectedExpLevel = BithirConfig.resistanceLevels.find(resistLv => resistLv.name === expLevelName);
                        if (selectedExpLevel) {
                            await this.generateNPC(generatorConfigName, selectedExpLevel);
                        }
                    }
                },
                Cancel: { label: api.localize(`CANCEL`) }
            }
        });
        
        x.options.width = 200;
        x.position.width = 350;
        x.render(true);
    }

    async generateNPC(generatorConfigName, xpLevel) {        
        const generatorConfig = await foundry.utils.fetchJsonWithTimeout(`${basePath}/data/${generatorConfigName}-generator.json`);
        const folderId = await this.getFolderID(generatorConfig.folderName);        
        
        const statBlock = BithirConfig.randomElement(generatorConfig.statBlocks); 
        game.symbaroum.log(`Making a ${xpLevel.name} ${statBlock.race} starting at ${xpLevel.abilities} abilities`);
        
        let gender = null;
        if (generatorConfig.gender && generatorConfig.gender.length > 0) {
            gender = `${BithirConfig.randomElement(generatorConfig.gender)}`;
        }
        
        const { files } = await foundry.applications.apps.FilePicker.browse("data", [generatorConfig.images, gender].filter(Boolean).join('/'));        

        let name = '';
        const builtin = /\{\@generateNames\[([^\]]*)\]\}/;
        const nameMatch = statBlock.name.match(builtin);
        if (nameMatch == null) {
            name = (await api.parseSimpleElement(generatorConfig.shadow, {}, `${statBlock.name}`)).capitalize();
        } else {
            let category = nameMatch[1];
            if (!nameMatch.includes('-') && gender) {
                category = `${nameMatch[1]}-${gender}`;                
            }
            name = (await game.symbaroum.api.generateNames(category, 1))[0];
        }

        const actorDetails = {
            name: name,
            type: "monster",
            img: BithirConfig.randomElement(files),
            folder: folderId,
            sort: 12000,
            system: {},
            token: {},
            items: [],
            flags: {}        
        };
        foundry.utils.setProperty(actorDetails, "system.bio.race", statBlock.race);
        foundry.utils.setProperty(actorDetails, "system.bio.appearance", ""); 
        foundry.utils.setProperty(actorDetails, "system.bio.occupation", statBlock.occupation ?? "");

        this.setAttributes(actorDetails, statBlock);
        const roll = await new Roll(xpLevel.abilities).evaluate();
        let startCoreCount = roll.total;
        let actor = await Actor.create(actorDetails);

        let itemList = generatorConfig.includedItems;
        let actorItems = []; 
        let abilities = generatorConfig.abilities;
        let sumWeight = 0;        
        
        for (var abil in abilities) {
            sumWeight += abilities[abil].weight;
            abilities[abil].abilityRef = abilities[abil].abilityRef.filter(abilityKeep => !statBlock.excludedAbilities.includes(abilityKeep));
        }

        abilities.core.abilityRef = abilities.core.abilityRef.concat(statBlock.includedAbilities);        
        abilities.common.abilityRef = abilities.common.abilityRef.concat(abilities.core.abilityRef);

        let currentXp = 0;
        for (let i = 0; i < startCoreCount; i++) {
            let chosenAbility = BithirConfig.randomElement(abilities.core.abilityRef);
            currentXp += this.addAbility(actorItems, chosenAbility);
            for (let abil2 in abilities) {
                abilities[abil2].abilityRef = abilities[abil2].abilityRef.filter((elem) => !chosenAbility.excludedAbilities.includes(elem.reference));
            }
            if (chosenAbility.includedAbilities.length > 0) {
                abilities["common"].abilityRef = abilities["common"].abilityRef.concat(chosenAbility.includedAbilities.map(elem => {
                    return { "reference": elem, "forcedAbilities": [], "excludedAbilities": [], "includedAbilities": [], "includesItems": [] };
                }));
            }
        }

        let evalCounter = 0;
        while (currentXp < xpLevel.experience) {
            if (Object.keys(abilities).length <= 1 || evalCounter > 15000) { break; }
            let rarity = Math.floor(Math.random() * (sumWeight)) + 1;
            
            for (let abil in abilities) {
                evalCounter++;
                if (evalCounter > 15000) { break; }
                if (abil === "core") continue;
                rarity -= abilities[abil].weight;

                if (abilities[abil].abilityRef.length === 0) {
                    sumWeight -= abilities[abil].weight;
                    delete abilities[abil];
                    continue;                    
                }

                if (rarity <= 0) {
                    let chosenAbility = BithirConfig.randomElement(abilities[abil].abilityRef);
                    if (!chosenAbility || !chosenAbility.reference) { continue; }
                    let moreXp = this.addAbility(actorItems, chosenAbility);
                    currentXp += moreXp;
                    if (moreXp === 0) {
                        chosenAbility.excludedAbilities.push(chosenAbility.reference);
                    }
                    for (let abil2 in abilities) {
                        abilities[abil2].abilityRef = abilities[abil2].abilityRef.filter((elem) => !chosenAbility.excludedAbilities.includes(elem.reference));
                    }
                    if (chosenAbility.includedAbilities.length > 0) {
                        let commonAbilities = abilities["common"].abilityRef;
                        abilities["common"].abilityRef = commonAbilities.concat(chosenAbility.includedAbilities.map(elem => {
                            return { "reference": elem, "forcedAbilities": [], "excludedAbilities": [], "includedAbilities": [], "includesItems": [] };
                        }));
                    }
                    break;
                }
            }
        }

        const itemConfig = await foundry.utils.fetchJsonWithTimeout(`${basePath}/data/equipment.json`);
        for (let ability of actorItems) {
            if (itemConfig[ability.system.reference]) {
                itemList = itemList.concat(itemConfig[ability.system.reference]);
            }
        }

        let armorAdded = false;
        for (let itemdesc of itemList) {
            if (itemdesc.match(/\{#[^\}]+\}/)) {
                let table = game.tables.getName(itemdesc.match(/\{#([^\}]+)\}/)[1]);
                if (!table) { continue; }
                let tableDraw = await table.roll();
                let itemToAdd = null;
                let itemName = null;
                for (let tr of tableDraw.results) {
                    if (tr.documentUuid) {
                        itemToAdd = (await fromUuid(tr.documentUuid)).toObject();
                    } else {
                        itemName = tr.description ?? tr.text ?? tr.name;
                    }
                }
                if (!itemToAdd) { continue; }
                if (itemName) {
                    foundry.utils.setProperty(itemToAdd, "name", (await api.parseSimpleElement(generatorConfig.shadow, {}, itemName)).capitalize());
                }
                if (itemToAdd.type === 'weapon' || itemToAdd.type === 'armor' && !armorAdded) {
                    itemToAdd.system.state = "active";
                    armorAdded = true;
                }
                actorItems.push(itemToAdd);
            } else {
                let match = itemdesc.match(/(?<number>[^]*)@(?<nameReg>.*)/);
                let number = "1";
                if (match) {
                    number = match.groups.number;
                    itemdesc = match.groups.nameReg;
                }
                let itemPick = game.items.filter(elem => {
                    if (!elem.system.isGear) return false;
                    let regex = new RegExp(itemdesc, 'i');
                    if (elem.system.isWeapon && elem.system.reference.match(regex) || elem.name.match(regex)) {
                        return true;
                    }
                    return false;
                });                
                if (itemPick.length === 0) { continue; }
                let roll = await new Roll(number).evaluate();
                let r = roll.total;

                for (let i = 0; i < r; i++) {
                    let itemToAdd = BithirConfig.randomElement(itemPick)?.toObject();                    
                    if (itemToAdd.type === 'weapon' || itemToAdd.type === 'armor' && !armorAdded) {
                        foundry.utils.setProperty(itemToAdd, "system.state", "active");
                        armorAdded = true;
                    }
                    actorItems.push(itemToAdd);
                }
            }
        }
        await actor.createEmbeddedDocuments("Item", actorItems);

        let healMe = { _id: actor.id };
        const myShadow = await api.generateShadow(generatorConfig.shadow, actor);        
        foundry.utils.setProperty(healMe, "system.bio.shadow", myShadow.capitalize());
        foundry.utils.setProperty(healMe, "system.health.toughness.value", foundry.utils.getProperty(actor, "system.health.toughness.max"));
        foundry.utils.setProperty(healMe, "system.experience.total", foundry.utils.getProperty(actor, "system.experience.spent"));
        await Actor.updateDocuments([healMe]);
        actor.sheet.render(true);
    }

    addAbility(actorItems, ability) {
        if (!ability || !ability.reference) { return 0; }
        let selectedAbility = actorItems.find(elem => elem.system.reference === ability.reference);
        if (!selectedAbility) {
            const newAbility = game.items.filter(element => element.system.reference === ability.reference && element.system.isPower && element.system.hasLevels);
            if (newAbility.length > 0) {
                selectedAbility = newAbility[0].toObject();
                let rnd = Math.floor(Math.random() * 100);
                let level = rnd > 95 ? 3 : rnd > 70 ? 2 : 1;

                if (selectedAbility.system.marker === "active") { level = 1; }
    
                foundry.utils.setProperty(selectedAbility, "system.master.isActive", level > 2);
                foundry.utils.setProperty(selectedAbility, "system.adept.isActive", level > 1);
                foundry.utils.setProperty(selectedAbility, "system.novice.isActive", true);                
                actorItems.push(selectedAbility);
                return BithirConfig.expCost(level);
            }
            return 0;
        } else {
            if (selectedAbility.system.marker === "active") { return 0; }
            let currentXPCost = BithirConfig.expCost(this.getLevel(selectedAbility));

            if (foundry.utils.getProperty(selectedAbility, "system.adept.isActive")) {
                foundry.utils.setProperty(selectedAbility, "system.master.isActive", true);
            }
            if (foundry.utils.getProperty(selectedAbility, "system.novice.isActive")) {
                foundry.utils.setProperty(selectedAbility, "system.adept.isActive", true);
            }
            return BithirConfig.expCost(this.getLevel(selectedAbility)) - currentXPCost;
        }
    }

    getLevel(selectedAbility) {
        if (foundry.utils.getProperty(selectedAbility, "system.master.isActive")) return 3;
        if (foundry.utils.getProperty(selectedAbility, "system.adept.isActive")) return 2;
        return 1;
    }

    setAttributes(actorDetails, statBlock) {
        for (let stat in statBlock.attributes) {
            foundry.utils.setProperty(actorDetails, `system.attributes.${stat}.value`, statBlock.attributes[stat]);
        }
    }

    async getFolderID(folderName) {
        let folder = game.folders.filter(f => f.name === folderName && f.type === 'Actor');
        if (folder.length === 0) {
            let f = await Folder.create({ name: folderName, type: 'Actor' });
            return f.id;
        } else { 
            return folder[0].id;
        }
    }

    async rollRollInspiration() {
        let dialog_content = `  
        <div class="form-group bithirmod">
        <div class="dialogHeader">
            <div class="dialogEntry"><label for="location" class="dialogEntry">${api.localize('inspiration_location_dice')}</label></div><div><input type="text" name="location" value="1" class="inspirationInput"></div>
        </div>
        <div class="dialogHeader">
            <div class="dialogEntry"><label for="event" class="dialogEntry">${api.localize('inspiration_event_dice')}</label></div><div><input type="text" name="event" value="1" class="inspirationInput"></div>
        </div>
        <div class="dialogHeader">
            <div class="dialogEntry"><label for="creature" class="dialogEntry">${api.localize('inspiration_creature_dice')}</label></div><div><input type="text" name="creature" value="1" class="inspirationInput"></div>
        </div>
        <div class="dialogHeader">
            <div class="dialogEntry"><label for="reward" class="dialogEntry">${api.localize('inspiration_reward_dice')}</label></div><div><input type="text" name="reward" value="1" class="inspirationInput"></div>
        </div>
        <br/>
        </div>`;
        
        let x = new Dialog({
            title: api.localize('inspiration_title'),
            content: dialog_content,
            buttons: {
                Ok: { 
                    label: api.localize('OK'), 
                    callback: async (html) => {             
                        let location = parseInt(html.find("input[name='location']")[0].value);
                        let event = parseInt(html.find("input[name='event']")[0].value);
                        let creature = parseInt(html.find("input[name='creature']")[0].value);
                        let reward = parseInt(html.find("input[name='reward']")[0].value);
                        let rollString = [];
                        if (!isNaN(location) && location !== 0) { rollString.push(`${location}dl`); }
                        if (!isNaN(event) && event !== 0) { rollString.push(`${event}de`); }
                        if (!isNaN(creature) && creature !== 0) { rollString.push(`${creature}dc`); }
                        if (!isNaN(reward) && reward !== 0) { rollString.push(`${reward}dr`); }
                        
                        let rolls = await new Roll(rollString.join('+')).evaluate();
                        let rollData = {
                            formula: rolls.formula,
                            rolls: this.assembleInspirationResults(rolls)
                        };
                        const template = await foundry.applications.handlebars.renderTemplate(`${templatePath}/inspirationroll.hbs`, rollData);

                        let chatData = {
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker({ alias: api.localize('inspiration_results') }),
                            roll: JSON.stringify(rolls),
                            rolls: [rolls],
                            rollMode: game.settings.get('core', 'rollMode'),
                            content: template,
                        };
                        
                        if (game.modules.get("dice-so-nice")?.active) {
                            const dsnsettings = game.user.getFlag("dice-so-nice", "settings");
                            if (!dsnsettings || dsnsettings.hideAfterRoll) {
                                if (!dsnsettings) {
                                    await game.user.setFlag('dice-so-nice', 'settings', game.dice3d.constructor.CONFIG());
                                }
                                const timeout = parseInt(game.user.getFlag("dice-so-nice", "settings").timeBeforeHide);
                                if (!isNaN(timeout)) {
                                    game.user.getFlag("dice-so-nice", "settings").hideAfterRoll = false;
                                    setTimeout(() => { 
                                        game.user.getFlag("dice-so-nice", "settings").hideAfterRoll = true;
                                    }, timeout + 500);
                                }
                            }
                        }
                        ChatMessage.create(chatData);
                    }
                },
                Cancel: { label: api.localize('CANCEL') }
            }  
        });
        
        x.options.width = 200;
        x.position.width = 300;
        x.render(true);
    }

    assembleInspirationResults(rolls) {
        let assembledResults = [];
        for (const dice of rolls.dice) {
            for (const result of dice.results) {
                result.css = dice.getResultCSS(result).join(' ');
                result.img = dice.getResultLabel(result);
                assembledResults.push(result);
            }
        }
        return assembledResults;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION HOOKS & SETUP
// ─────────────────────────────────────────────────────────────────────────────
async function migrateImportedUtilityTranslations() {
    if (!game.user?.isGM) return;

    const currentVersion = game.settings.get(moduleId, 'utilityTranslationMigrationVersion') ?? 0;
    if (currentVersion >= translationMigrationVersion) return;

    try {
        const folderUpdates = game.folders
            .filter(folder => folderNameMigrations[folder.name])
            .map(folder => ({ _id: folder.id, name: folderNameMigrations[folder.name] }));

        if (folderUpdates.length > 0) {
            await Folder.updateDocuments(folderUpdates);
        }

        for (const table of game.tables ?? []) {
            const migratedTableName = tableNameMigrations[table.name];
            if (migratedTableName) {
                await table.update({ name: migratedTableName });
            }

            const resultUpdates = [];
            for (const result of table.results ?? []) {
                const text = result.text ?? result.description;
                const migratedText = tableResultTextMigrations[text];
                if (migratedText) {
                    resultUpdates.push({ _id: result.id, text: migratedText, description: migratedText });
                }
            }

            if (resultUpdates.length > 0 && typeof table.updateEmbeddedDocuments === 'function') {
                await table.updateEmbeddedDocuments('TableResult', resultUpdates);
            }
        }

        await game.settings.set(moduleId, 'utilityTranslationMigrationVersion', translationMigrationVersion);
    } catch (error) {
        console.error(`${moduleId} | Failed to migrate imported utility translations`, error);
    }
}

export function setupBithirMod() {
    // Register settings
    game.settings.register(moduleId, 'hideShadowGeneration', {
        name: 'BITHIRMOD.SHADOW_hideGeneration',
        hint: 'BITHIRMOD.SHADOW_hideGeneration_hint',
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register(moduleId, 'hideShadowLabel', {
        name: 'BITHIRMOD.SHADOW_hideLabel',
        hint: 'BITHIRMOD.SHADOW_hideLabel_hint',
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register(moduleId, 'utilityTranslationMigrationVersion', {
        scope: "world",
        config: false,
        default: 0,
        type: Number
    });

    Hooks.once('ready', migrateImportedUtilityTranslations);

    // Register Custom Dice Terms
    CONFIG.Dice.terms[LocationDie.DENOMINATION] = LocationDie;
    CONFIG.Dice.terms[EventDie.DENOMINATION] = EventDie;
    CONFIG.Dice.terms[CreatureDie.DENOMINATION] = CreatureDie;
    CONFIG.Dice.terms[RewardDie.DENOMINATION] = RewardDie;

    // Hook up Dice So Nice
    Hooks.once('diceSoNiceReady', (dice3d) => {
        dice3d.addColorset(LocationDie.diceSoNiceColorset);
        dice3d.addDicePreset(LocationDie.diceSoNiceDicePreset);
        dice3d.addColorset(EventDie.diceSoNiceColorset);
        dice3d.addDicePreset(EventDie.diceSoNiceDicePreset);
        dice3d.addColorset(CreatureDie.diceSoNiceColorset);
        dice3d.addDicePreset(CreatureDie.diceSoNiceDicePreset);
        dice3d.addColorset(RewardDie.diceSoNiceColorset);
        dice3d.addDicePreset(RewardDie.diceSoNiceDicePreset);
    });

    // Character Sheet Generate Shadow UI button
    Hooks.on('renderActorSheet', (app, html, data) => {
        if (game.settings.get(moduleId, 'hideShadowGeneration') || 
            !app.object.testUserPermission(game.user, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) {
            return;
        }
        
        let labelTxt = api.localize('SHADOW_LABELTEXT');
        if (game.settings.get(moduleId, 'hideShadowLabel')) {
            labelTxt = "";
        }
        
        let actor = app.object;
        let openBtn = $(`<a class="bithirmod-generate-shadow" data-tooltip="${api.localize('SHADOW_TITLE')}"><i class="fa-solid fa-circle-half-stroke"></i>${labelTxt}</a>`);
        openBtn.click(async ev => {
            let shadowSelection = foundry.utils.duplicate(BithirConfig.shadowTypes);
            if (actor.getFlag(moduleId, 'originalShadow')) {
                shadowSelection.push('restoreshadow');
            }
            let shadowList = shadowSelection.map((elem) => {
                return `<option value="${elem}">${api.localize(`SHADOW_${elem}`)}</option>`;
            }).join('');

            let dialog_content = `<div class="form-group bithirmod">
                <h2>${api.localize('SHADOW_SELECTSHADOWTYPE')}</h2>
                <br />
                <div style="dialogHeader">
                    <div style="width:10em;min-width:10em;"><select id="shadow" name="shadow">${shadowList}</select></div>
                </div><br/>
            </div>`;
            
            const x = new Dialog({
                content: dialog_content,
                buttons: {
                    Ok: { 
                        label: api.localize(`OK`), 
                        callback: async (html) => {
                            const selectedShadow = html.find('#shadow')[0].value;
                            if (selectedShadow === 'restoreshadow') {
                                let originalShadow = await actor.getFlag(moduleId, 'originalShadow');
                                actor.update({ 'system.bio.shadow': originalShadow });
                            } else {
                                if (actor.system.bio?.shadow && actor.system.bio.shadow !== '') {
                                    await actor.setFlag(moduleId, 'originalShadow', actor.system.bio.shadow);
                                }
                                const newShadow = await api.generateShadow(selectedShadow, actor);
                                actor.update({ 'system.bio.shadow': newShadow.capitalize() });
                            }
                        }
                    },
                    Cancel: { label: api.localize(`CANCEL`) }
                }
            });
            
            x.options.width = 200;
            x.position.width = 300;
            x.render(true);        
        });
        
        html.closest('.app').find('.bithirmod-generate-shadow').remove();
        let titleElement = html.closest('.app').find('.window-title');
        openBtn.insertAfter(titleElement);
    });

    // Expose macros API under game namespaces
    const bithirObj = {
        config: BithirConfig,
        macros: new BithirMacros(),
        api: api
    };

    if (game.tenebreResources) {
        game.tenebreResources.bithir = bithirObj;
    }
    game.bithirmod = bithirObj; // keep same namespace for backwards compatibility inside table roll commands
}
