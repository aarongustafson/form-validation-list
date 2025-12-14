export declare class FormValidationListElement extends HTMLElement {
	get ["for"](): string | null;
	set ["for"](value: string | null);
	get fieldId(): string | null;
	set fieldId(value: string | null);
	get triggerEvent(): string;
	set triggerEvent(value: string | null);
	get eachDelay(): number;
	set eachDelay(value: number | string | null);
	get fieldInvalidClass(): string;
	set fieldInvalidClass(value: string | null);
	get fieldValidClass(): string;
	set fieldValidClass(value: string | null);
	get ruleUnmatchedClass(): string;
	set ruleUnmatchedClass(value: string | null);
	get ruleMatchedClass(): string;
	set ruleMatchedClass(value: string | null);
	get validationMessage(): string | null;
	set validationMessage(value: string | null);
	validate(): boolean;
	get isValid(): boolean;
}

export declare function defineFormValidationList(tagName?: string): boolean;

declare global {
	interface HTMLElementTagNameMap {
		'form-validation-list': FormValidationListElement;
	}
}
