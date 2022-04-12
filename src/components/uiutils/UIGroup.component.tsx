import React from 'react';
import classes from './UIGroup.module.scss';


type Props = {
    title: string;
    children: any;
}
export const UIGroup: React.FC<Props> = ({title, children}) => {
    return (
        <div className={classes.UIGroup}>
            <div className={classes.heading}>{title}</div>
            {children}
        </div>
    );
};